CREATE TABLE IF NOT EXISTS route_patterns (
    pattern_id BIGSERIAL PRIMARY KEY,

    vehicle_id TEXT NOT NULL
        REFERENCES vehicles(vehicle_id),

    route_name TEXT,

    start_latitude NUMERIC NOT NULL,
    start_longitude NUMERIC NOT NULL,

    end_latitude NUMERIC NOT NULL,
    end_longitude NUMERIC NOT NULL,

    start_radius_m DOUBLE PRECISION NOT NULL DEFAULT 500,
    end_radius_m DOUBLE PRECISION NOT NULL DEFAULT 500,

    representative_trip_id BIGINT
        REFERENCES trips(trip_id)
        ON DELETE SET NULL,

    trip_count INTEGER NOT NULL DEFAULT 0,

    avg_distance_km NUMERIC,
    avg_duration_seconds NUMERIC,

    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,

    status TEXT NOT NULL DEFAULT 'CANDIDATE'
        CHECK (status IN ('CANDIDATE', 'EMERGING', 'RECURRING', 'IGNORED')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_patterns_vehicle
    ON route_patterns(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_route_patterns_status
    ON route_patterns(status);

CREATE INDEX IF NOT EXISTS idx_route_patterns_start
    ON route_patterns
    USING GIST (ST_SetSRID(ST_MakePoint(start_longitude, start_latitude), 4326));

CREATE INDEX IF NOT EXISTS idx_route_patterns_end
    ON route_patterns
    USING GIST (ST_SetSRID(ST_MakePoint(end_longitude, end_latitude), 4326));


-- Trips belonging to a discovered pattern
CREATE TABLE IF NOT EXISTS route_pattern_trips (
    pattern_id BIGINT NOT NULL
        REFERENCES route_patterns(pattern_id)
        ON DELETE CASCADE,

    trip_id BIGINT NOT NULL
        REFERENCES trips(trip_id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (pattern_id, trip_id)
);

CREATE INDEX IF NOT EXISTS idx_route_pattern_trips_trip
    ON route_pattern_trips(trip_id);


-- Discover recurring route candidates for one vehicle.
--   CANDIDATE = 1-2 trips
--   EMERGING  = 3-4 trips
--   RECURRING = 5+ trips AND >= 3 trips in the last 30 days

CREATE OR REPLACE FUNCTION discover_route_patterns(
    p_vehicle_id TEXT,
    p_start_radius_m DOUBLE PRECISION DEFAULT 500,
    p_end_radius_m DOUBLE PRECISION DEFAULT 500,
    p_distance_tolerance DOUBLE PRECISION DEFAULT 0.20,
    p_min_distance_km DOUBLE PRECISION DEFAULT 1
)
RETURNS TABLE (
    start_latitude NUMERIC,
    start_longitude NUMERIC,
    end_latitude NUMERIC,
    end_longitude NUMERIC,
    trip_count BIGINT,
    recent_trip_count BIGINT,
    avg_distance_km NUMERIC,
    avg_duration_seconds NUMERIC,
    min_distance_km NUMERIC,
    max_distance_km NUMERIC,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    status TEXT,
    representative_trip_id BIGINT,
    trip_ids BIGINT[]
)
LANGUAGE sql
STABLE
AS $$
WITH completed AS (
    SELECT
        t.trip_id,
        t.start_time,
        t.distance_km,
        t.duration_seconds,
        ST_SetSRID(ST_MakePoint(t.start_longitude, t.start_latitude), 4326) AS start_geom,
        ST_SetSRID(ST_MakePoint(t.end_longitude,   t.end_latitude),   4326) AS end_geom
    FROM trips t
    WHERE t.vehicle_id = p_vehicle_id
      AND t.status = 'completed'
      AND t.distance_km >= p_min_distance_km
      AND t.start_latitude IS NOT NULL AND t.start_longitude IS NOT NULL
      AND t.end_latitude   IS NOT NULL AND t.end_longitude   IS NOT NULL
),
clustered AS (
    SELECT
        c.*,
        ST_ClusterDBSCAN(
            ST_Transform(c.start_geom, 3857),
            eps := p_start_radius_m / COS(RADIANS(ST_Y(c.start_geom))),
            minpoints := 1
        ) OVER () AS start_cluster,
        ST_ClusterDBSCAN(
            ST_Transform(c.end_geom, 3857),
            eps := p_end_radius_m / COS(RADIANS(ST_Y(c.end_geom))),
            minpoints := 1
        ) OVER () AS end_cluster
    FROM completed c
),
banded AS (
    SELECT
        cl.*,
        FLOOR(LN(GREATEST(cl.distance_km, 0.001)) / LN(1 + p_distance_tolerance))
            AS distance_band
    FROM clustered cl
),
aggregated AS (
    SELECT
        ST_Y(ST_Centroid(ST_Collect(b.start_geom)))::NUMERIC AS start_latitude,
        ST_X(ST_Centroid(ST_Collect(b.start_geom)))::NUMERIC AS start_longitude,
        ST_Y(ST_Centroid(ST_Collect(b.end_geom)))::NUMERIC   AS end_latitude,
        ST_X(ST_Centroid(ST_Collect(b.end_geom)))::NUMERIC   AS end_longitude,

        COUNT(*) AS trip_count,
        COUNT(*) FILTER (WHERE b.start_time >= NOW() - INTERVAL '30 days') AS recent_trip_count,
        ROUND(AVG(b.distance_km)::NUMERIC, 1)      AS avg_distance_km,
        ROUND(AVG(b.duration_seconds)::NUMERIC, 0) AS avg_duration_seconds,
        ROUND(MIN(b.distance_km)::NUMERIC, 1)      AS min_distance_km,
        ROUND(MAX(b.distance_km)::NUMERIC, 1)      AS max_distance_km,

        MIN(b.start_time) AS first_seen,
        MAX(b.start_time) AS last_seen,

        (ARRAY_AGG(b.trip_id ORDER BY b.start_time DESC))[1] AS representative_trip_id,
        ARRAY_AGG(b.trip_id ORDER BY b.start_time DESC)      AS trip_ids
    FROM banded b
    GROUP BY b.start_cluster, b.end_cluster, b.distance_band
)
SELECT
    a.start_latitude,
    a.start_longitude,
    a.end_latitude,
    a.end_longitude,
    a.trip_count,
    a.recent_trip_count,
    a.avg_distance_km,
    a.avg_duration_seconds,
    a.min_distance_km,
    a.max_distance_km,
    a.first_seen,
    a.last_seen,
    CASE
        WHEN a.trip_count >= 5 AND a.recent_trip_count >= 3 THEN 'RECURRING'
        WHEN a.trip_count >= 3 THEN 'EMERGING'
        ELSE 'CANDIDATE'
    END AS status,
    a.representative_trip_id,
    a.trip_ids
FROM aggregated a
ORDER BY a.trip_count DESC, a.last_seen DESC;
$$;


-- persist discovery results
CREATE OR REPLACE FUNCTION refresh_route_patterns(
    p_vehicle_id TEXT,
    p_start_radius_m DOUBLE PRECISION DEFAULT 500,
    p_end_radius_m DOUBLE PRECISION DEFAULT 500,
    p_distance_tolerance DOUBLE PRECISION DEFAULT 0.20,
    p_min_distance_km DOUBLE PRECISION DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    rec        RECORD;
    v_pattern  BIGINT;
    v_count    INTEGER := 0;
BEGIN
    -- 1. clear previous auto-discovered patterns
    DELETE FROM route_patterns
    WHERE vehicle_id = p_vehicle_id
      AND status != 'IGNORED';

    -- 2. insert new snapshot patterns
    FOR rec IN
        SELECT * FROM discover_route_patterns(
            p_vehicle_id, p_start_radius_m, p_end_radius_m,
            p_distance_tolerance, p_min_distance_km
        )
    LOOP
        -- skip inserting if the cluster overlaps an existing IGNORED pattern
        IF EXISTS (
            SELECT 1 FROM route_patterns ip
            WHERE ip.vehicle_id = p_vehicle_id
              AND ip.status = 'IGNORED'
              AND ST_DWithin(
                    ST_SetSRID(ST_MakePoint(ip.start_longitude, ip.start_latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(rec.start_longitude, rec.start_latitude), 4326)::geography,
                    p_start_radius_m
                  )
              AND ST_DWithin(
                    ST_SetSRID(ST_MakePoint(ip.end_longitude, ip.end_latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(rec.end_longitude, rec.end_latitude), 4326)::geography,
                    p_end_radius_m
                  )
        ) THEN
            CONTINUE;
        END IF;

        INSERT INTO route_patterns (
            vehicle_id, route_name,
            start_latitude, start_longitude, end_latitude, end_longitude,
            start_radius_m, end_radius_m,
            representative_trip_id, trip_count,
            avg_distance_km, avg_duration_seconds,
            first_seen, last_seen, status, updated_at
        )
        VALUES (
            p_vehicle_id,
            NULLIF(
                COALESCE(describe_point_area(rec.start_latitude::double precision,
                                             rec.start_longitude::double precision), '?')
                || ' -> ' ||
                COALESCE(describe_point_area(rec.end_latitude::double precision,
                                             rec.end_longitude::double precision), '?'),
                '? -> ?'
            ),
            rec.start_latitude, rec.start_longitude,
            rec.end_latitude, rec.end_longitude,
            p_start_radius_m, p_end_radius_m,
            rec.representative_trip_id, rec.trip_count,
            rec.avg_distance_km, rec.avg_duration_seconds,
            rec.first_seen, rec.last_seen, rec.status, NOW()
        )
        RETURNING pattern_id INTO v_pattern;

        -- insert trip associations
        INSERT INTO route_pattern_trips (pattern_id, trip_id)
        SELECT v_pattern, unnest(rec.trip_ids)
        ON CONFLICT DO NOTHING;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- discover across the whole fleet
CREATE OR REPLACE FUNCTION refresh_all_route_patterns()
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v   RECORD;
    n   INTEGER := 0;
BEGIN
    FOR v IN SELECT DISTINCT vehicle_id FROM trips WHERE status = 'completed'
    LOOP
        n := n + refresh_route_patterns(v.vehicle_id);
    END LOOP;
    RETURN n;
END;
$$;
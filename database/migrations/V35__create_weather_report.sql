CREATE TABLE IF NOT EXISTS report_areas (
    id           BIGSERIAL PRIMARY KEY,
    area_key     TEXT NOT NULL UNIQUE,
    area_kind    TEXT NOT NULL CHECK (area_kind IN ('suburb', 'city_other', 'rural')),
    area_name    TEXT NOT NULL,
    city_name    TEXT,
    anchor       GEOMETRY(Point, 4326) NOT NULL,
    weather_lat  NUMERIC(6,3) NOT NULL,
    weather_lon  NUMERIC(6,3) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_areas_weather
    ON report_areas (weather_lat, weather_lon);

CREATE TABLE IF NOT EXISTS geo_cell_area (
    lat_cell INTEGER NOT NULL,
    lon_cell INTEGER NOT NULL,
    area_id  BIGINT  NOT NULL REFERENCES report_areas(id),
    PRIMARY KEY (lat_cell, lon_cell)
);

CREATE TABLE IF NOT EXISTS area_vehicle_day (
    day                 DATE    NOT NULL,
    vehicle_id          TEXT    NOT NULL,
    area_id             BIGINT  NOT NULL REFERENCES report_areas(id),
    moving_points       INTEGER NOT NULL DEFAULT 0,
    harsh_braking       INTEGER NOT NULL DEFAULT 0,
    harsh_acceleration  INTEGER NOT NULL DEFAULT 0,
    harsh_cornering     INTEGER NOT NULL DEFAULT 0,
    over_speeding       INTEGER NOT NULL DEFAULT 0,
    crash_alerts        INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, vehicle_id, area_id)
);

CREATE INDEX IF NOT EXISTS idx_area_vehicle_day_vehicle
    ON area_vehicle_day (vehicle_id, day);

CREATE TABLE IF NOT EXISTS area_refresh_log (
    day          DATE PRIMARY KEY,
    refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE OR REPLACE FUNCTION resolve_report_area(
    p_lon DOUBLE PRECISION,
    p_lat DOUBLE PRECISION
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_pt          geometry := ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326);
    v_suburb      TEXT;
    v_suburb_geom geometry;
    v_city        TEXT;
    v_city_geom   geometry;
    v_city_dist   DOUBLE PRECISION;
    v_kind        TEXT;
    v_name        TEXT;
    v_anchor      geometry;
    v_key         TEXT;
    v_id          BIGINT;
BEGIN
    SELECT name, geom INTO v_suburb, v_suburb_geom
    FROM places
    WHERE place_type IN ('suburb', 'neighbourhood', 'quarter')
      AND name IS NOT NULL AND name <> ''
      AND GeometryType(geom) IN ('POLYGON', 'MULTIPOLYGON')
      AND ST_Contains(geom, v_pt)
    ORDER BY ST_Area(geom)
    LIMIT 1;

    IF v_suburb IS NULL THEN
        SELECT name, geom INTO v_suburb, v_suburb_geom
        FROM places
        WHERE place_type IN ('suburb', 'neighbourhood', 'quarter')
          AND name IS NOT NULL AND name <> ''
          AND GeometryType(geom) = 'POINT'
        ORDER BY geom <-> v_pt
        LIMIT 1;

        IF v_suburb IS NOT NULL
           AND ST_Distance(v_suburb_geom::geography, v_pt::geography) > 2000 THEN
            v_suburb := NULL;
            v_suburb_geom := NULL;
        END IF;
    END IF;

    SELECT name, geom INTO v_city, v_city_geom
    FROM places
    WHERE place_type IN ('city', 'town')
      AND name IS NOT NULL AND name <> ''
      AND GeometryType(geom) IN ('POLYGON', 'MULTIPOLYGON')
      AND ST_Contains(geom, v_pt)
    ORDER BY ST_Area(geom)
    LIMIT 1;

    IF v_city IS NOT NULL THEN
        v_city_dist := 0;
    ELSE
        SELECT name, geom INTO v_city, v_city_geom
        FROM places
        WHERE place_type IN ('city', 'town')
          AND name IS NOT NULL AND name <> ''
          AND GeometryType(geom) = 'POINT'
        ORDER BY geom <-> v_pt
        LIMIT 1;

        IF v_city IS NOT NULL THEN
            v_city_dist := ST_Distance(v_city_geom::geography, v_pt::geography);
        END IF;
    END IF;

    IF v_suburb IS NOT NULL THEN
        v_kind   := 'suburb';
        v_name   := v_suburb;
        v_anchor := ST_PointOnSurface(v_suburb_geom);
    ELSIF v_city IS NOT NULL AND v_city_dist <= 20000 THEN
        v_kind   := 'city_other';
        v_name   := v_city || ' (other areas)';
        v_anchor := ST_PointOnSurface(v_city_geom);
    ELSIF v_city IS NOT NULL THEN
        v_kind   := 'rural';
        v_name   := 'Rural, near ' || v_city;
        v_anchor := ST_PointOnSurface(v_city_geom);
    ELSE
        v_kind   := 'rural';
        v_name   := 'Unmapped area';
        v_anchor := v_pt;
    END IF;

    v_key := v_kind || '|' || v_name || '|' || COALESCE(v_city, '');

    INSERT INTO report_areas
        (area_key, area_kind, area_name, city_name, anchor, weather_lat, weather_lon)
    VALUES (
        v_key, v_kind, v_name, v_city, v_anchor,
        round(ST_Y(v_anchor)::numeric, 1),
        round(ST_X(v_anchor)::numeric, 1)
    )
    ON CONFLICT (area_key) DO NOTHING;

    SELECT id INTO v_id FROM report_areas WHERE area_key = v_key;
    RETURN v_id;
END;
$$;


CREATE OR REPLACE FUNCTION refresh_area_vehicle_day(p_day DATE)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_start TIMESTAMPTZ := p_day::timestamp       AT TIME ZONE 'Africa/Johannesburg';
    v_end   TIMESTAMPTZ := (p_day + 1)::timestamp AT TIME ZONE 'Africa/Johannesburg';
    v_rows  INTEGER;
BEGIN
    DROP TABLE IF EXISTS _avd_points;
    DROP TABLE IF EXISTS _avd_events;

    CREATE TEMP TABLE _avd_points AS
    SELECT vehicle_id,
           round(latitude  / 0.005)::int AS lat_cell,
           round(longitude / 0.005)::int AS lon_cell,
           COUNT(*)::int                 AS moving_points
    FROM clean_telemetry
    WHERE time >= v_start AND time < v_end
      AND latitude IS NOT NULL AND longitude IS NOT NULL
      AND speed > 5
    GROUP BY 1, 2, 3;

    CREATE TEMP TABLE _avd_events AS
    SELECT vehicle_id,
           round(latitude  / 0.005)::int AS lat_cell,
           round(longitude / 0.005)::int AS lon_cell,
           (COUNT(*) FILTER (WHERE event_category = 'green_driving_type'
                               AND event_detail = 'harsh_braking'))::int      AS harsh_braking,
           (COUNT(*) FILTER (WHERE event_category = 'green_driving_type'
                               AND event_detail = 'harsh_acceleration'))::int AS harsh_acceleration,
           (COUNT(*) FILTER (WHERE event_category = 'green_driving_type'
                               AND event_detail = 'harsh_cornering'))::int    AS harsh_cornering,
           (COUNT(*) FILTER (WHERE event_category = 'over_speeding'))::int    AS over_speeding,
           (COUNT(*) FILTER (WHERE event_category = 'crash_detection'))::int  AS crash_alerts
    FROM vehicle_events
    WHERE time >= v_start AND time < v_end
      AND latitude IS NOT NULL AND longitude IS NOT NULL
      AND (
            (event_category = 'green_driving_type'
             AND event_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering'))
         OR event_category = 'over_speeding'
         -- Rows with an empty detail are status records, not detections.
         OR (event_category = 'crash_detection'
             AND event_detail LIKE 'real crash detected%')
      )
    GROUP BY 1, 2, 3;

    INSERT INTO geo_cell_area (lat_cell, lon_cell, area_id)
    SELECT c.lat_cell, c.lon_cell,
           resolve_report_area((c.lon_cell * 0.005)::float8, (c.lat_cell * 0.005)::float8)
    FROM (
        SELECT lat_cell, lon_cell FROM _avd_points
        UNION
        SELECT lat_cell, lon_cell FROM _avd_events
    ) c
    WHERE NOT EXISTS (
        SELECT 1 FROM geo_cell_area g
        WHERE g.lat_cell = c.lat_cell AND g.lon_cell = c.lon_cell
    )
    ON CONFLICT DO NOTHING;

    DELETE FROM area_vehicle_day WHERE day = p_day;

    INSERT INTO area_vehicle_day (
        day, vehicle_id, area_id, moving_points,
        harsh_braking, harsh_acceleration, harsh_cornering, over_speeding, crash_alerts
    )
    SELECT p_day, x.vehicle_id, g.area_id,
           SUM(x.moving_points),
           SUM(x.harsh_braking), SUM(x.harsh_acceleration), SUM(x.harsh_cornering),
           SUM(x.over_speeding), SUM(x.crash_alerts)
    FROM (
        SELECT vehicle_id, lat_cell, lon_cell, moving_points,
               0 AS harsh_braking, 0 AS harsh_acceleration, 0 AS harsh_cornering,
               0 AS over_speeding, 0 AS crash_alerts
        FROM _avd_points
        UNION ALL
        SELECT vehicle_id, lat_cell, lon_cell, 0,
               harsh_braking, harsh_acceleration, harsh_cornering,
               over_speeding, crash_alerts
        FROM _avd_events
    ) x
    JOIN geo_cell_area g
      ON g.lat_cell = x.lat_cell AND g.lon_cell = x.lon_cell
    GROUP BY x.vehicle_id, g.area_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    INSERT INTO area_refresh_log (day, refreshed_at)
    VALUES (p_day, NOW())
    ON CONFLICT (day) DO UPDATE SET refreshed_at = EXCLUDED.refreshed_at;

    DROP TABLE _avd_points;
    DROP TABLE _avd_events;

    RETURN v_rows;
END;
$$;


CREATE OR REPLACE PROCEDURE backfill_area_vehicle_day(p_from DATE, p_to DATE)
LANGUAGE plpgsql
AS $$
DECLARE
    d DATE := p_from;
BEGIN
    WHILE d <= p_to LOOP
        PERFORM refresh_area_vehicle_day(d);
        COMMIT;
        RAISE NOTICE 'area_vehicle_day refreshed for %', d;
        d := d + 1;
    END LOOP;
END;
$$;


CREATE OR REPLACE PROCEDURE refresh_recent_area_vehicle_day(job_id INT, config JSONB)
LANGUAGE plpgsql
AS $$
DECLARE
    v_latest DATE;
BEGIN
    SELECT (MAX(time) AT TIME ZONE 'Africa/Johannesburg')::date
    INTO v_latest
    FROM clean_telemetry;

    IF v_latest IS NULL THEN
        RETURN;
    END IF;

    PERFORM refresh_area_vehicle_day(v_latest - 1);
    PERFORM refresh_area_vehicle_day(v_latest);
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM timescaledb_information.jobs
        WHERE proc_name = 'refresh_recent_area_vehicle_day'
    ) THEN
        PERFORM add_job('refresh_recent_area_vehicle_day', INTERVAL '15 minutes');
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule refresh job (%). Call refresh_area_vehicle_day() from the app on a timer instead.', SQLERRM;
END;
$$;
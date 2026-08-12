-- Route generation: a reference corridor from telemetry the vehicle
-- actually recorded.

-- Simplification tolerance in degrees. ~5m at these latitudes..
-- Same value get_trip_replay_geojson (V11) uses, for the same reason.
CREATE OR REPLACE FUNCTION route_simplify_tolerance()
RETURNS DOUBLE PRECISION LANGUAGE sql IMMUTABLE AS $$ SELECT 0.00005; $$;

-- Build a corridor from one completed trip.
--
-- Returns the geometry plus distance and duration so the frontend can
-- preview before the manager commits
CREATE OR REPLACE FUNCTION route_generate_from_trip(p_trip_id BIGINT)
RETURNS TABLE (
    geom             GEOMETRY(LINESTRING, 4326),
    distance_m       DOUBLE PRECISION,
    estimated_time_s INTEGER,
    point_count      INTEGER,
    error            TEXT
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
    t      RECORD;
    v_line GEOMETRY;
BEGIN
    SELECT trip_id, vehicle_id, start_time, end_time, duration_seconds
      INTO t
    FROM trips
    WHERE trip_id = p_trip_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::GEOMETRY(LINESTRING,4326), NULL::DOUBLE PRECISION,
                            NULL::INTEGER, NULL::INTEGER,
                            format('Trip %s not found', p_trip_id)::TEXT;
        RETURN;
    END IF;

    IF t.end_time IS NULL THEN
        RETURN QUERY SELECT NULL::GEOMETRY(LINESTRING,4326), NULL::DOUBLE PRECISION,
                            NULL::INTEGER, NULL::INTEGER,
                            'Trip is still open -- only completed trips can define a route'::TEXT;
        RETURN;
    END IF;

    SELECT ST_Simplify(ST_MakeLine(ct.location ORDER BY ct.time),
                       route_simplify_tolerance())
      INTO v_line
    FROM clean_telemetry ct
    WHERE ct.vehicle_id = t.vehicle_id
      AND ct.measurement = 'avl'
      AND ct.time BETWEEN t.start_time AND t.end_time
      AND ct.location IS NOT NULL;

    -- ST_MakeLine needs 2+ points; with fewer it returns NULL, and a
    -- single-point "corridor" would make ST_DWithin meaningless.
    IF v_line IS NULL OR ST_NumPoints(v_line) < 2 THEN
        RETURN QUERY SELECT NULL::GEOMETRY(LINESTRING,4326), NULL::DOUBLE PRECISION,
                            NULL::INTEGER, NULL::INTEGER,
                            'Trip has too few position points to form a route'::TEXT;
        RETURN;
    END IF;

    RETURN QUERY SELECT
        v_line::GEOMETRY(LINESTRING,4326),
        ST_Length(v_line::geography),
        t.duration_seconds,
        ST_NumPoints(v_line),
        NULL::TEXT;
END;
$$;

-- Candidate reference routes for a vehicle.
-- Groups completed trips by rounded distance,
CREATE OR REPLACE FUNCTION get_route_candidates(
    p_vehicle_id TEXT,
    p_min_km     DOUBLE PRECISION DEFAULT 1
)
RETURNS TABLE (
    representative_trip_id BIGINT,
    distance_km            NUMERIC,
    times_driven           BIGINT,
    avg_minutes            NUMERIC,
    last_driven            TIMESTAMPTZ
)
LANGUAGE sql STABLE AS $$
    SELECT
        (array_agg(t.trip_id ORDER BY t.start_time DESC))[1],
        ROUND(t.distance_km::numeric, 1),
        COUNT(*),
        ROUND(AVG(t.duration_seconds) / 60.0, 0),
        MAX(t.start_time)
    FROM trips t
    WHERE t.vehicle_id = p_vehicle_id
      AND t.status = 'completed'
      AND t.distance_km >= p_min_km
    GROUP BY ROUND(t.distance_km::numeric, 1)
    ORDER BY COUNT(*) DESC, ROUND(t.distance_km::numeric, 1) DESC;
$$;

-- Corridor from an explicit time window, for cases where trip boundaries
-- aren't what the manager wants 
CREATE OR REPLACE FUNCTION route_generate_from_window(
    p_vehicle_id TEXT,
    p_from       TIMESTAMPTZ,
    p_to         TIMESTAMPTZ
)
RETURNS TABLE (
    geom             GEOMETRY(LINESTRING, 4326),
    distance_m       DOUBLE PRECISION,
    estimated_time_s INTEGER,
    point_count      INTEGER,
    error            TEXT
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_line GEOMETRY;
BEGIN
    IF p_to <= p_from THEN
        RETURN QUERY SELECT NULL::GEOMETRY(LINESTRING,4326), NULL::DOUBLE PRECISION,
                            NULL::INTEGER, NULL::INTEGER,
                            'End time must be after start time'::TEXT;
        RETURN;
    END IF;

    SELECT ST_Simplify(ST_MakeLine(ct.location ORDER BY ct.time),
                       route_simplify_tolerance())
      INTO v_line
    FROM clean_telemetry ct
    WHERE ct.vehicle_id = p_vehicle_id
      AND ct.measurement = 'avl'
      AND ct.time BETWEEN p_from AND p_to
      AND ct.location IS NOT NULL;

    IF v_line IS NULL OR ST_NumPoints(v_line) < 2 THEN
        RETURN QUERY SELECT NULL::GEOMETRY(LINESTRING,4326), NULL::DOUBLE PRECISION,
                            NULL::INTEGER, NULL::INTEGER,
                            'No position data for that vehicle in that window'::TEXT;
        RETURN;
    END IF;

    RETURN QUERY SELECT
        v_line::GEOMETRY(LINESTRING,4326),
        ST_Length(v_line::geography),
        EXTRACT(EPOCH FROM (p_to - p_from))::INTEGER,
        ST_NumPoints(v_line),
        NULL::TEXT;
END;
$$;
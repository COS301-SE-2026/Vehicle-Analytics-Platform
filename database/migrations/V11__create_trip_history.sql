-- A trip starts when ignition = 'On' AND movement = 'On' AND speed > 0, and
-- is confirmed ended once ignition = 'Off' AND movement = 'Off' AND speed = 0
-- holds through the debounce window. A trip row is inserted as 'open' when
-- the trip starts, then updated to 'completed' once the state machine
-- confirms the end. (State machine itself lives in application code.)

CREATE TABLE trips (
    trip_id BIGSERIAL PRIMARY KEY,
    vehicle_id TEXT NOT NULL REFERENCES vehicles (vehicle_id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    last_movement_time TIMESTAMPTZ,
    start_odometer NUMERIC,
    end_odometer NUMERIC,
    distance_km NUMERIC,
    duration_seconds INTEGER,
    start_latitude NUMERIC,
    start_longitude NUMERIC,
    end_latitude NUMERIC,
    end_longitude NUMERIC,
    avg_speed_kmh NUMERIC,
    max_speed_kmh NUMERIC,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT trips_end_after_start CHECK (end_time IS NULL OR end_time >= start_time)
);

-- Only one open trip per vehicle at a time. Small partial index -- only
-- indexes the currently-open rows, not the whole table.
CREATE UNIQUE INDEX idx_trips_one_open_per_vehicle
    ON trips (vehicle_id)
    WHERE status = 'open';

CREATE INDEX idx_trips_vehicle_start_covering
    ON trips (vehicle_id, start_time DESC)
    INCLUDE (end_time, distance_km, duration_seconds, avg_speed_kmh, max_speed_kmh, status);

CREATE INDEX idx_trips_start_time ON trips (start_time DESC);

CREATE INDEX idx_trips_status_last_movement ON trips (status, last_movement_time);

-- Trip history list endpoint. Keyset pagination through
-- p_before_start_time rather than OFFSET, so page 50 is exactly as fast as
-- page 1 regardless of how many trips have accumulated.
CREATE OR REPLACE FUNCTION get_trip_history(
    p_vehicle_id TEXT,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_before_start_time TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    trip_id BIGINT,
    vehicle_id TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    distance_km NUMERIC,
    duration_seconds INTEGER,
    avg_speed_kmh NUMERIC,
    max_speed_kmh NUMERIC,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.trip_id, t.vehicle_id, t.start_time, t.end_time,
        t.distance_km, t.duration_seconds, t.avg_speed_kmh, t.max_speed_kmh, t.status
    FROM trips t
    WHERE t.vehicle_id = p_vehicle_id
      AND (p_start_date IS NULL OR t.start_time >= p_start_date)
      AND (p_end_date IS NULL OR t.end_time IS NULL OR t.end_time <= p_end_date)
      AND (p_before_start_time IS NULL OR t.start_time < p_before_start_time)
    ORDER BY t.start_time DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Raw tabular replay: numeric points in time order. For an open trip,
-- end_time is NULL so the replay runs up to the current time.
CREATE OR REPLACE FUNCTION get_trip_replay(
    p_trip_id BIGINT
)
RETURNS TABLE (
    point_time TIMESTAMPTZ,
    latitude NUMERIC,
    longitude NUMERIC,
    speed_kmh NUMERIC
) AS $$
DECLARE
    v_vehicle_id TEXT;
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
BEGIN
    SELECT t.vehicle_id, t.start_time, COALESCE(t.end_time, now())
    INTO v_vehicle_id, v_start_time, v_end_time
    FROM trips t
    WHERE t.trip_id = p_trip_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip % not found', p_trip_id;
    END IF;

    RETURN QUERY
    SELECT ct.time, ct.latitude, ct.longitude, ct.speed::NUMERIC
    FROM clean_telemetry ct
    WHERE ct.measurement = 'avl'
      AND ct.vehicle_id = v_vehicle_id
      AND ct.time BETWEEN v_start_time AND v_end_time
    ORDER BY ct.time ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- GeoJSON replay for the map: a simplified LineString for the route itself

CREATE OR REPLACE FUNCTION get_trip_replay_geojson(
    p_trip_id BIGINT,
    p_simplify_tolerance DOUBLE PRECISION DEFAULT 0.00005 -- ~5m at the equator
)
RETURNS JSON
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_vehicle_id TEXT;
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_route JSON;
    v_points JSON;
BEGIN
    SELECT t.vehicle_id, t.start_time, COALESCE(t.end_time, now())
    INTO v_vehicle_id, v_start_time, v_end_time
    FROM trips t WHERE t.trip_id = p_trip_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip % not found', p_trip_id;
    END IF;

    SELECT ST_AsGeoJSON(ST_Simplify(ST_MakeLine(ct.location ORDER BY ct.time), p_simplify_tolerance))::json
    INTO v_route
    FROM clean_telemetry ct
    WHERE ct.vehicle_id = v_vehicle_id
      AND ct.measurement = 'avl'
      AND ct.time BETWEEN v_start_time AND v_end_time
      AND ct.location IS NOT NULL;

    SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
            json_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(ct.location)::json,
                'properties', json_build_object('time', ct.time, 'speed', ct.speed)
            ) ORDER BY ct.time
        ), '[]'::json)
    )
    INTO v_points
    FROM clean_telemetry ct
    WHERE ct.vehicle_id = v_vehicle_id
      AND ct.measurement = 'avl'
      AND ct.time BETWEEN v_start_time AND v_end_time
      AND ct.location IS NOT NULL;

    RETURN json_build_object('route', v_route, 'points', v_points);
END;
$$;

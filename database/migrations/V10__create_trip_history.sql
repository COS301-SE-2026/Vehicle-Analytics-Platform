-- the logic we used to define the trip history
-- trip history table, populated by the trip detection state machine
-- a trip starts when ignition = 'On' AND movement = 'On' AND speed > 0, and is confirmed ended once ignition = 'Off' AND movement = 'Off' AND speed = 0 holds through the debounce window
-- a trip row is inserted as 'open' when the trip starts, then updated to 'completed' once the state machine confirms the end

CREATE TABLE trips (
    trip_id BIGSERIAL PRIMARY KEY, -- BIGSERIAL is a shorthand for creating an 8-byte, auto-incrementing integer column
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

-- only one open trip per vehicle at a time
-- make maintaing easy since it only indexes the small number of currently open rows, not the whole table
CREATE UNIQUE INDEX idx_trips_one_open_per_vehicle
    ON trips (vehicle_id)
    WHERE status = 'open';


CREATE INDEX idx_trips_vehicle_start_covering
    ON trips (vehicle_id, start_time DESC)
    INCLUDE (end_time, distance_km, duration_seconds, avg_speed_kmh, max_speed_kmh, status);

--Fleet-wide index for views that list recent trips across all vehicles rather than one vehicle at a time
CREATE INDEX idx_trips_start_time ON trips (start_time DESC);

--Watchdog index, finds open trips that have gone quiet regardless of total table size
CREATE INDEX idx_trips_status_last_movement ON trips (status, last_movement_time);

--Function used by the trip history list endpoint
--Uses keyset pagination through p_before_start_time rather than OFFSET, so page 50 is exactly as fast as page 1 no matter how many trips a vehicle or the fleet has accumulated
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
        t.trip_id,
        t.vehicle_id,
        t.start_time,
        t.end_time,
        t.distance_km,
        t.duration_seconds,
        t.avg_speed_kmh,
        t.max_speed_kmh,
        t.status
    FROM trips t
    WHERE t.vehicle_id = p_vehicle_id
      AND (p_start_date IS NULL OR t.start_time >= p_start_date)
      AND (p_end_date IS NULL OR t.end_time IS NULL OR t.end_time <= p_end_date)
      AND (p_before_start_time IS NULL OR t.start_time < p_before_start_time)
    ORDER BY t.start_time DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function used by the trip replay endpoint, returns the raw telemetry points for one trip in time order
-- For an open trip end_time is NULL, so the replay runs up to the current time
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
    SELECT
        ct.time AS point_time,
        ct.latitude,
        ct.longitude,
        ct.speed::NUMERIC AS speed_kmh
    FROM clean_telemetry ct
    WHERE ct.measurement = 'avl'
      AND ct.vehicle_id = v_vehicle_id
      AND ct.time BETWEEN v_start_time AND v_end_time
    ORDER BY ct.time ASC;
END;
$$ LANGUAGE plpgsql STABLE;
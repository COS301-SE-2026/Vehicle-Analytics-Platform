-- Trip detection state machine.

-- The debounce is what stops a red light from ending a trip. Note there is
-- a THIRD state -- ignition On, movement Off, speed 0 (idling) -- which is
-- neither moving nor stopped: the trip stays open and last_movement_time
-- simply doesn't advance. That's the desired behaviour and it falls out of
-- the definitions rather than needing a special case.

CREATE OR REPLACE FUNCTION trip_debounce_window()
RETURNS INTERVAL LANGUAGE sql IMMUTABLE AS $$ SELECT INTERVAL '3 minutes'; $$;

-- Longer than the debounce: this is for vehicles that vanish mid-trip
-- (device offline, tunnel, end of shift) and never send the stopped state
-- that would close the trip normally.
CREATE OR REPLACE FUNCTION trip_watchdog_window()
RETURNS INTERVAL LANGUAGE sql IMMUTABLE AS $$ SELECT INTERVAL '30 minutes'; $$;

-- Shared state classification
CREATE OR REPLACE FUNCTION is_vehicle_moving(p_ignition TEXT, p_movement TEXT, p_speed INTEGER)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
    SELECT lower(COALESCE(p_ignition,'')) = 'ignition on'
       AND lower(COALESCE(p_movement,'')) = 'movement on'
       AND COALESCE(p_speed, 0) > 0;
$$;

CREATE OR REPLACE FUNCTION is_vehicle_stopped(p_ignition TEXT, p_movement TEXT, p_speed INTEGER)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
    SELECT lower(COALESCE(p_ignition,'')) = 'ignition off'
       AND lower(COALESCE(p_movement,'')) = 'movement off'
       AND COALESCE(p_speed, 0) = 0;
$$;

-- Fills in end-of-trip metrics by scanning the breadcrumbs between start
-- and end. Separated out because the trigger, the watchdog and the
-- backfill all need identical closing logic.
CREATE OR REPLACE FUNCTION finalize_trip(p_trip_id BIGINT, p_end_time TIMESTAMPTZ)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    t RECORD;
    m RECORD;
BEGIN
    SELECT * INTO t FROM trips WHERE trip_id = p_trip_id AND status = 'open';
    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT MAX(ct.total_odometer)                AS end_odo,
           ROUND(AVG(NULLIF(ct.speed, 0)))       AS avg_speed,
           MAX(ct.speed)                         AS max_speed,
           (array_agg(ct.latitude  ORDER BY ct.time DESC))[1] AS end_lat,
           (array_agg(ct.longitude ORDER BY ct.time DESC))[1] AS end_lng
      INTO m
    FROM clean_telemetry ct
    WHERE ct.vehicle_id = t.vehicle_id
      AND ct.measurement = 'avl'
      AND ct.time BETWEEN t.start_time AND p_end_time;

    UPDATE trips SET
        status           = 'completed',
        end_time         = p_end_time,
        end_odometer     = COALESCE(m.end_odo, start_odometer),
        end_latitude     = m.end_lat,
        end_longitude    = m.end_lng,

        distance_km      = GREATEST(0, (COALESCE(m.end_odo, start_odometer) - start_odometer) / 1000.0),
        duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (p_end_time - start_time))::INTEGER),
        -- AVG over NULLIF(speed,0) excludes stationary samples
        avg_speed_kmh    = m.avg_speed,
        max_speed_kmh    = m.max_speed
    WHERE trip_id = p_trip_id;
END;
$$;

CREATE OR REPLACE FUNCTION process_trips_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
BEGIN

    FOR rec IN
        SELECT DISTINCT ON (vehicle_id)
               vehicle_id, time, latitude, longitude, speed, total_odometer,
               ignition, movement
        FROM new_ct_rows
        WHERE measurement = 'avl'
          AND latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY vehicle_id, time DESC
    LOOP
        IF is_vehicle_moving(rec.ignition, rec.movement, rec.speed) THEN

            UPDATE trips
               SET last_movement_time = rec.time
             WHERE vehicle_id = rec.vehicle_id
               AND status = 'open'
               AND (last_movement_time IS NULL OR rec.time > last_movement_time);

            INSERT INTO trips (
                vehicle_id, start_time, last_movement_time,
                start_odometer, start_latitude, start_longitude, status
            )
            VALUES (
                rec.vehicle_id, rec.time, rec.time,
                rec.total_odometer, rec.latitude, rec.longitude, 'open'
            )
            ON CONFLICT (vehicle_id) WHERE status = 'open' DO NOTHING;

        ELSIF is_vehicle_stopped(rec.ignition, rec.movement, rec.speed) THEN

            PERFORM finalize_trip(t.trip_id, rec.time)
            FROM trips t
            WHERE t.vehicle_id = rec.vehicle_id
              AND t.status = 'open'
              AND t.last_movement_time IS NOT NULL
              AND rec.time - t.last_movement_time >= trip_debounce_window();

        END IF;
    END LOOP;

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO telemetry_errors (vehicle_id, error_message, raw_payload)
    VALUES (NULL, 'Trip detection failure: ' || SQLERRM, NULL);
    RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_process_trips
AFTER INSERT ON clean_telemetry
REFERENCING NEW TABLE AS new_ct_rows
FOR EACH STATEMENT
EXECUTE FUNCTION process_trips_batch();

CREATE OR REPLACE FUNCTION close_stale_trips()
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    rec    RECORD;
    v_done INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT trip_id, last_movement_time
        FROM trips
        WHERE status = 'open'
          AND last_movement_time IS NOT NULL
          AND last_movement_time < NOW() - trip_watchdog_window()
    LOOP
        -- Ends the trip at its last known movement
        PERFORM finalize_trip(rec.trip_id, rec.last_movement_time);
        v_done := v_done + 1;
    END LOOP;

    RETURN v_done;
END;
$$;

CREATE OR REPLACE PROCEDURE close_stale_trips_job(job_id INT, config JSONB)
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM close_stale_trips();
END;
$$;

SELECT add_job('close_stale_trips_job', '10 minutes');

-- Reconstructs trips from existing breadcrumbs
CREATE OR REPLACE FUNCTION backfill_trips(p_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v_inserted INTEGER;
BEGIN
    WITH moving AS (
        SELECT vehicle_id, time, latitude, longitude, speed, total_odometer
        FROM clean_telemetry
        WHERE measurement = 'avl'
          AND time >= NOW() - (p_days || ' days')::INTERVAL
          AND latitude IS NOT NULL AND longitude IS NOT NULL
          AND is_vehicle_moving(ignition, movement, speed)
    ),
    marked AS (
        SELECT *,
               CASE WHEN LAG(time) OVER w IS NULL
                      OR time - LAG(time) OVER w > trip_debounce_window()
                    THEN 1 ELSE 0 END AS starts_trip
        FROM moving
        WINDOW w AS (PARTITION BY vehicle_id ORDER BY time)
    ),
    sessions AS (
        SELECT *, SUM(starts_trip) OVER (PARTITION BY vehicle_id ORDER BY time) AS trip_seq
        FROM marked
    ),
    agg AS (
        SELECT vehicle_id, trip_seq,
               MIN(time) AS start_time,
               MAX(time) AS end_time,
               MIN(total_odometer) AS start_odo,
               MAX(total_odometer) AS end_odo,
               (array_agg(latitude  ORDER BY time))[1]      AS start_lat,
               (array_agg(longitude ORDER BY time))[1]      AS start_lng,
               (array_agg(latitude  ORDER BY time DESC))[1] AS end_lat,
               (array_agg(longitude ORDER BY time DESC))[1] AS end_lng,
               ROUND(AVG(NULLIF(speed, 0))) AS avg_speed,
               MAX(speed) AS max_speed,
               COUNT(*) AS points
        FROM sessions
        GROUP BY vehicle_id, trip_seq
    )
    INSERT INTO trips (
        vehicle_id, start_time, end_time, last_movement_time,
        start_odometer, end_odometer, distance_km, duration_seconds,
        start_latitude, start_longitude, end_latitude, end_longitude,
        avg_speed_kmh, max_speed_kmh, status
    )
    SELECT vehicle_id, start_time, end_time, end_time,
           start_odo, end_odo,
           GREATEST(0, (end_odo - start_odo) / 1000.0),
           GREATEST(0, EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER),
           start_lat, start_lng, end_lat, end_lng,
           avg_speed, max_speed, 'completed'
    FROM agg
    WHERE points >= 3;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted;
END;
$$;

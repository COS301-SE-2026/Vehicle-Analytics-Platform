-- Route deviation monitoring.
--
-- Statement-level trigger on clean_telemetry, matching the geofence and
-- trip triggers: one execution per ingestion batch, set-based, using the
-- transition table.
--
-- The check itself is deliberately cheap -- a single ST_DWithin against a
-- GIST-indexed LINESTRING. All the expensive work (Dijkstra, road
-- snapping) happened once at route creation.

-- Hysteresis margin. A vehicle must come back within
-- (allowed_deviation_m - this) to be considered recovered.
CREATE OR REPLACE FUNCTION route_recovery_margin_m()
RETURNS DOUBLE PRECISION LANGUAGE sql IMMUTABLE AS $$ SELECT 25; $$;

CREATE OR REPLACE FUNCTION process_route_deviation_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Cheap short-circuit: with no active routes this costs one index
    -- probe per batch rather than a join over every incoming row.
    IF NOT EXISTS (SELECT 1 FROM routes WHERE active LIMIT 1) THEN
        RETURN NULL;
    END IF;

    CREATE TEMP TABLE _eval ON COMMIT DROP AS
    WITH latest AS (
        -- One point per vehicle per batch
        SELECT DISTINCT ON (vehicle_id)
               vehicle_id, time, location
        FROM new_ct_rows
        WHERE measurement = 'avl' AND location IS NOT NULL
        ORDER BY vehicle_id, time DESC
    )
    SELECT
        l.vehicle_id,
        l.time,
        l.location,
        ST_Y(l.location) AS lat,
        ST_X(l.location) AS lng,
        r.route_id,
        r.allowed_deviation_m,
        ST_Distance(l.location::geography, r.geom::geography) AS distance_m,
        COALESCE(rs.is_on_route, TRUE) AS was_on_route
    FROM latest l
    JOIN routes r
      ON r.vehicle_id = l.vehicle_id AND r.active
    LEFT JOIN route_state rs
      ON rs.vehicle_id = l.vehicle_id
    -- Out-of-order guard
    WHERE rs.last_checked_time IS NULL OR l.time > rs.last_checked_time;

    -- Transition ON -> OFF: open one incident.
    INSERT INTO route_deviation_events (
        route_id, vehicle_id, occurred_at,
        distance_from_route, max_distance_m, latitude, longitude
    )
    SELECT route_id, vehicle_id, time, distance_m, distance_m, lat, lng
    FROM _eval
    WHERE was_on_route
      AND distance_m > allowed_deviation_m;

    -- Still off-route: no new row, just track the worst distance reached.
    UPDATE route_deviation_events e
       SET max_distance_m = GREATEST(COALESCE(e.max_distance_m, 0), v.distance_m),
           distance_from_route = v.distance_m
    FROM _eval v
    WHERE e.vehicle_id = v.vehicle_id
      AND e.resolved_at IS NULL
      AND NOT v.was_on_route
      AND v.distance_m > (v.allowed_deviation_m - route_recovery_margin_m());

    -- Transition OFF -> ON: close the open incident.
    UPDATE route_deviation_events e
       SET resolved_at = v.time
    FROM _eval v
    WHERE e.vehicle_id = v.vehicle_id
      AND e.resolved_at IS NULL
      AND NOT v.was_on_route
      AND v.distance_m <= (v.allowed_deviation_m - route_recovery_margin_m());

    -- Record current state
    INSERT INTO route_state (
        vehicle_id, route_id, is_on_route, last_distance_m, last_checked_time, updated_at
    )
    SELECT
        vehicle_id, route_id,
        CASE
            WHEN was_on_route THEN distance_m <= allowed_deviation_m
            ELSE distance_m <= (allowed_deviation_m - route_recovery_margin_m())
        END,
        distance_m, time, NOW()
    FROM _eval
    ON CONFLICT (vehicle_id) DO UPDATE SET
        route_id          = EXCLUDED.route_id,
        is_on_route       = EXCLUDED.is_on_route,
        last_distance_m   = EXCLUDED.last_distance_m,
        last_checked_time = EXCLUDED.last_checked_time,
        updated_at        = NOW()
    WHERE route_state.last_checked_time IS NULL
       OR EXCLUDED.last_checked_time > route_state.last_checked_time;

    RETURN NULL;

EXCEPTION WHEN OTHERS THEN
    INSERT INTO telemetry_errors (vehicle_id, error_message, raw_payload)
    VALUES (NULL, 'Route deviation check failure: ' || SQLERRM, NULL);
    RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_process_route_deviation
AFTER INSERT ON clean_telemetry
REFERENCING NEW TABLE AS new_ct_rows
FOR EACH STATEMENT
EXECUTE FUNCTION process_route_deviation_batch();

-- Assigning or reassigning a route must clear stale state, or a vehicle
-- that was off its OLD route stays flagged against the new one -- and its
-- open incident would then be closed by a distance measured against a
-- completely different line.
CREATE OR REPLACE FUNCTION reset_route_state()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE route_deviation_events
       SET resolved_at = NOW()
     WHERE vehicle_id = NEW.vehicle_id AND resolved_at IS NULL;

    DELETE FROM route_state WHERE vehicle_id = NEW.vehicle_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_reset_route_state
AFTER INSERT OR UPDATE OF geom, active ON routes
FOR EACH ROW
EXECUTE FUNCTION reset_route_state();
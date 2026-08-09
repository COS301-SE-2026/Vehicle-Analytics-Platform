CREATE OR REPLACE FUNCTION process_geofence_events_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM geofences LIMIT 1) THEN
        RETURN NULL;
    END IF;

    WITH latest_points AS (
        SELECT DISTINCT ON (vehicle_id) vehicle_id, time, speed, location
        FROM new_ct_rows
        WHERE location IS NOT NULL
        ORDER BY vehicle_id, time DESC
    ),
    evaluated AS (
        SELECT
            lp.vehicle_id, lp.time, lp.speed, lp.location,
            g.id AS geofence_id, g.trigger_type,
            ST_Contains(g.boundary, lp.location) AS currently_inside,
            COALESCE(s.is_inside, FALSE) AS previously_inside
        FROM latest_points lp
        JOIN geofences g
          ON (g.vehicle_id IS NULL OR g.vehicle_id = lp.vehicle_id)
         AND g.boundary && lp.location
        LEFT JOIN geofence_state s
          ON s.geofence_id = g.id AND s.vehicle_id = lp.vehicle_id
        WHERE s.last_updated IS NULL OR lp.time > s.last_updated
    )
    INSERT INTO geofence_events (geofence_id, vehicle_id, event_type, location, speed, event_time)
    SELECT geofence_id, vehicle_id,
           CASE WHEN currently_inside AND NOT previously_inside THEN 'entry' ELSE 'exit' END,
           location, speed, time
    FROM evaluated
    WHERE (currently_inside AND NOT previously_inside AND trigger_type IN ('entry', 'both'))
       OR (NOT currently_inside AND previously_inside AND trigger_type IN ('exit', 'both'));

    WITH latest_points AS (
        SELECT DISTINCT ON (vehicle_id) vehicle_id, time, location
        FROM new_ct_rows
        WHERE location IS NOT NULL
        ORDER BY vehicle_id, time DESC
    ),
    new_state AS (
        SELECT lp.vehicle_id, g.id AS geofence_id, lp.time,
               ST_Contains(g.boundary, lp.location) AS currently_inside
        FROM latest_points lp
        JOIN geofences g
          ON (g.vehicle_id IS NULL OR g.vehicle_id = lp.vehicle_id)
         AND g.boundary && lp.location
    )
    INSERT INTO geofence_state (geofence_id, vehicle_id, is_inside, last_updated)
    SELECT geofence_id, vehicle_id, currently_inside, ns.time
    FROM new_state ns
    ON CONFLICT (geofence_id, vehicle_id) DO UPDATE SET
        is_inside    = EXCLUDED.is_inside,
        last_updated = EXCLUDED.last_updated
    WHERE geofence_state.last_updated IS NULL
       OR EXCLUDED.last_updated > geofence_state.last_updated;

    RETURN NULL;
END;
$$;

CREATE TRIGGER geofence_event_trigger
AFTER INSERT ON clean_telemetry
REFERENCING NEW TABLE AS new_ct_rows
FOR EACH STATEMENT
EXECUTE FUNCTION process_geofence_events_batch();

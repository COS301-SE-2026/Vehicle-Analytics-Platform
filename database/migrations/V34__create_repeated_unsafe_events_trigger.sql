-- Migration: V34__create_repeated_unsafe_events_trigger.sql
-- Evaluates repeated_unsafe_events custom alert rules against incoming
-- vehicle_events rows. 

CREATE OR REPLACE FUNCTION evaluate_repeated_unsafe_events_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    debounce_minutes INT := 5;

BEGIN
    IF NOT EXISTS(

        SELECT 1 FROM custom_alert_rules
        WHERE status = 'active' 
        AND condition_type = 'repeated_unsafe_events'

        LIMIT 1
    ) THEN
        RETURN NULL;
    END IF;
 
    WITH latest_unsafe_event AS(
     
        SELECT DISTINCT ON (vehicle_id) vehicle_id, time, latitude, longitude
        FROM new_events

        WHERE event_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering')

        ORDER BY vehicle_id, time DESC
    ),
 
    candidate_breaches AS(
        SELECT
            r.id AS rule_id, lu.vehicle_id, r.fleet_group_id, r.condition_type,
            lu.latitude, lu.longitude, lu.time,
            jsonb_build_object('name', r.name, 'condition_params', r.condition_params) AS rule_snapshot,

            (
                SELECT COUNT(*)
                FROM vehicle_events ve

                WHERE ve.vehicle_id = lu.vehicle_id
                  AND ve.event_detail IN (
                      SELECT jsonb_array_elements_text(r.condition_params->'event_types')
                  )

                  AND ve.time > (lu.time - ((r.condition_params->>'window_minutes')::NUMERIC || ' minutes')::INTERVAL)
                  AND ve.time <= lu.time

            ) AS event_count,

            (r.condition_params->>'count')::INT AS required_count
        FROM latest_unsafe_event lu
        JOIN vehicles v ON v.vehicle_id = lu.vehicle_id

        JOIN custom_alert_rules r
          ON r.fleet_group_id = v.fleet_group_id

         AND r.status = 'active'
         AND r.condition_type = 'repeated_unsafe_events'
    ),
 
    deduped_breaches AS(
        SELECT 1
        FROM candidate_breaches cb

        WHERE cb.event_count >= cb.required_count
          AND NOT EXISTS(

              SELECT 1 FROM triggered_alerts ta
              WHERE ta.rule_id = cb.rule_id

                AND ta.vehicle_id = cb.vehicle_id
                AND ta.created_at > (cb.time - (debounce_minutes || ' minutes')::INTERVAL)
          )
    )
 
    INSERT INTO triggered_alerts(
        rule_id, vehicle_id, fleet_group_id, condition_type,
        breach_value, threshold_value, latitude, longitude, created_at, rule_snapshot
    )

    SELECT
        rule_id, vehicle_id, fleet_group_id, condition_type,
        event_count::TEXT, required_count::TEXT, latitude, longitude, time, rule_snapshot

    FROM deduped_breaches;
 
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS repeated_unsafe_events_trigger ON vehicle_events;
 
CREATE TRIGGER repeated_unsafe_events_trigger

AFTER INSERT ON vehicle_events

REFERENCING NEW TABLE AS new_events

FOR EACH STATEMENT

EXECUTE FUNCTION evaluate_repeated_unsafe_events_rules();



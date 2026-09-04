-- Migration: V32__create_custom_alert_evaluation_trigger.sql

CREATE OR REPLACE FUNCTION evaluate_custom_alert_rules_batch()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$ 
DECLARE
    debounce_minutes INT := 5;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM custom_alert_rules WHERE status = 'active' LIMIT 1)
THEN 
        RETURN NULL;

    END IF;

    WITH latest_points AS (
        SELECT DISTINCT ON (vehicle_id) vehicle_id, time, speed, latitude, longitude
        FROM new_ct_rows
        ORDER BY vehicle_id, time DESC
    ),

    speed_breaches AS (
         SELECT 
            r.id AS rule_id, lp.vehicle_id, r.fleet_group_id, r.condition_type,
            lp.speed::TEXT AS breach_value,
            (r.condition_params->>'max_speed_kmh') AS threshold_value,
            lp.latitude, lp.longitude, lp.time,
            jsonb_build_object('name', r.name, 'condition_params', r.condition_params) AS rule_snapshot

        FROM latest_points lp
        JOIN vehicles v ON v.vehicle_id = lp.vehicle_id
        JOIN custom_alert_rules r

            ON r.fleet_group_id = v.fleet_group_id
            AND r.status = 'active'
             AND r.condition_type = 'speed_threshold'
        WHERE lp.speed > (r.condition_params->>'max_speed_kmh')::NUMERIC
    ),
    

    time_breaches AS (
        SELECT 
            r.id AS rule_id, lp.vehicle_id, r.fleet_group_id, r.condition_type,
            lp.time::TIME::TEXT AS breach_value,
            (r.condition_params->>'start_time') || '-' || (r.condition_params->>'end_time') AS threshold_value,
            lp.latitude, lp.longitude, lp.time,
            jsonb_build_object( 'name', r.name,'condition_params', r.condition_params) AS rule_snapshot

        FROM latest_points lp
        JOIN vehicles v ON v.vehicle_id = lp.vehicle_id
        JOIN custom_alert_rules r

            ON r.fleet_group_id = v.fleet_group_id
            AND r.status = 'active'
             AND r.condition_type = 'time_based_restriction'
        WHERE (
            CASE
              
                WHEN (r.condition_params->>'start_time')::TIME > (r.condition_params->>'end_time')::TIME THEN
                    lp.time::TIME >= (r.condition_params->>'start_time')::TIME
                    OR lp.time::TIME < (r.condition_params->>'end_time')::TIME

                ELSE

                    lp.time::TIME >= (r.condition_params->>'start_time')::TIME
                    AND lp.time::TIME < (r.condition_params->>'end_time')::TIME
            END
        )
        AND (
            r.condition_params->'restricted_days' IS NULL
            OR r.condition_params->'restricted_days' ? to_char(lp.time, 'Dy')
        )
    ),

    all_breaches AS (

        SELECT * FROM speed_breaches
        UNION ALL

        SELECT * FROM time_breaches
    ),


    deduped_breaches AS (
        SELECT ab.*
        FROM all_breaches ab
        WHERE NOT EXISTS (

            SELECT 1 FROM triggered_alerts ta

            WHERE ta.rule_id = ab.rule_id

              AND ta.vehicle_id = ab.vehicle_id
              AND ta.created_at > (ab.time - (debounce_minutes || ' minutes')::INTERVAL)
        )
    )
 
    INSERT INTO triggered_alerts (
        rule_id, vehicle_id, fleet_group_id, condition_type,

        breach_value, threshold_value, latitude, longitude, created_at, rule_snapshot
    )

    SELECT
        rule_id, vehicle_id, fleet_group_id, condition_type,

        breach_value, threshold_value, latitude, longitude, time, rule_snapshot

    FROM deduped_breaches;
 
    RETURN NULL;
END;
$$;
 
 
CREATE TRIGGER custom_alert_evaluation_trigger

AFTER INSERT ON clean_telemetry

REFERENCING NEW TABLE AS new_ct_rows

FOR EACH STATEMENT

EXECUTE FUNCTION evaluate_custom_alert_rules_batch();
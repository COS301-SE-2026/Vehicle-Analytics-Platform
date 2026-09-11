-- Migration: V35__create_trip_duration_exceeded_trigger.sql
-- Evaluates trip_duration_exceeded custom alert rules when a trip
-- transitions from 'open' to 'completed' (set by finalize_trip(), the
-- existing trip state machine). Checks both a single-trip duration cap
-- and a same-day cumulative duration cap.

\i common_alert_constants.sql

CREATE OR REPLACE FUNCTION evaluate_trip_duration_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$

DECLARE

    v_debounce_minutes CONSTANT INT := :debounce_minutes;
    v_status_active CONSTANT TEXT := :'c_status_active';
    v_status_open CONSTANT TEXT := :'c_status_open';
    v_status_completed CONSTANT TEXT := :'c_status_completed';
    v_condition_type CONSTANT TEXT := :'c_condition_type';
    v_fleet_group_id BIGINT;
    v_trip_minutes NUMERIC;
    v_daily_minutes NUMERIC;
    v_rule RECORD;

BEGIN

    
    IF NOT (OLD.status = c_status_open AND NEW.status = c_status_completed) THEN
        RETURN NEW;
    END IF;

    SELECT fleet_group_id
    INTO v_fleet_group_id
    FROM vehicles
    WHERE vehicle_id = NEW.vehicle_id;

    IF v_fleet_group_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_trip_minutes := NEW.duration_seconds / 60.0;

    FOR v_rule IN
    (
        SELECT id, name, condition_params
        FROM custom_alert_rules
        WHERE fleet_group_id = v_fleet_group_id
          AND status = c_status_active
          AND condition_type = c_condition_type

    ) LOOP

        -- Check single-trip duration limit
        IF v_rule.condition_params ? 'max_trip_minutes'
           AND v_trip_minutes >
               (v_rule.condition_params->>'max_trip_minutes')::NUMERIC THEN

            INSERT INTO triggered_alerts(
                rule_id,
                vehicle_id,
                fleet_group_id,
                condition_type,
                breach_value,
                threshold_value,
                created_at,
                rule_snapshot
            )
            SELECT
                v_rule.id,
                NEW.vehicle_id,
                v_fleet_group_id,
                condition_type_trip_duration,
                round(v_trip_minutes)::TEXT,
                v_rule.condition_params->>'max_trip_minutes',
                v_rule.id, NEW.vehicle_id, v_fleet_group_id, c_condition_type,
                round(v_trip_minutes)::TEXT, v_rule.condition_params->>'max_trip_minutes', 
                
                NEW.end_time,
                jsonb_build_object(
                    'name', v_rule.name,
                    'condition_params', v_rule.condition_params
                )
            WHERE NOT EXISTS
            (
                SELECT 1
                FROM triggered_alerts ta
                WHERE ta.rule_id = v_rule.id
                  AND ta.vehicle_id = NEW.vehicle_id
                  AND ta.created_at >
                      (
                          NEW.end_time
                          - (debounce_minutes || ' minutes')::INTERVAL
                      )
            );

        END IF;

        -- Check same-day cumulative duration limit
        IF v_rule.condition_params ? 'max_daily_minutes' THEN

            SELECT SUM(duration_seconds) / 60.0
            INTO v_daily_minutes
            FROM trips
            WHERE vehicle_id = NEW.vehicle_id
              AND status = c_status_completed
              AND DATE(start_time) = DATE(NEW.start_time);

            IF v_daily_minutes >
               (v_rule.condition_params->>'max_daily_minutes')::NUMERIC THEN

                INSERT INTO triggered_alerts(
                    rule_id,
                    vehicle_id,
                    fleet_group_id,
                    condition_type,
                    breach_value,
                    threshold_value,
                    created_at,
                    rule_snapshot
                )
                SELECT
                    v_rule.id,
                    NEW.vehicle_id,
                    v_fleet_group_id,
                    condition_type_trip_duration,
                    round(v_daily_minutes)::TEXT,
                    v_rule.condition_params->>'max_daily_minutes',
                    NEW.end_time,
                    jsonb_build_object(
                        'name', v_rule.name,
                        'condition_params', v_rule.condition_params
                    )
                WHERE NOT EXISTS
                (
                    SELECT 1
                    FROM triggered_alerts ta
                    WHERE ta.rule_id = v_rule.id
                      AND ta.vehicle_id = NEW.vehicle_id
                      AND ta.created_at >
                          (
                              NEW.end_time
                              - (debounce_minutes || ' minutes')::INTERVAL
                          )
                );

            END IF;
        END IF;

    END LOOP;

    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trip_duration_alert_trigger ON trips;

CREATE TRIGGER trip_duration_alert_trigger
AFTER UPDATE OF status ON trips
FOR EACH ROW
WHEN (OLD.status = 'open' AND NEW.status = 'completed')
EXECUTE FUNCTION evaluate_trip_duration_rules();

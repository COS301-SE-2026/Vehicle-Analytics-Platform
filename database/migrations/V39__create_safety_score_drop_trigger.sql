CREATE OR REPLACE FUNCTION evaluate_safety_score_drop_rules()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE 
    debounce_minutes INT := 5;
    v_fleet_group_id BIGINT;

BEGIN

    IF TG_OP = 'UPDATE' AND NEW.safety_score = OLD.safety_score THEN
        RETURN NEW;
    END IF;

    SELECT fleet_group_id INTO v_fleet_group_id
    FROM vehicles 
    WHERE vehicle_id = NEW.vehicle_id;

    IF v_fleet_group_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO triggered_alerts (

        rule_id, vehicle_id, fleet_group_id, condition_type, breach_value,
        threshold_value, created_at, rule_snapshot
    )

    SELECT 
        r.id, NEW.vehicle_id, r.fleet_group_id,
        'safety_score_drop', NEW.safety_score::TEXT,
        r.condition_params->>'min_score',NOW(),
        jsonb_build_object('name', r.name, 'condition_params', r.condition_params)

    FROM custom_alert_rules r
    WHERE r.fleet_group_id = v_fleet_group_id

        AND r.status = 'active'
        AND r.condition_type = 'safety_score_drop'
        AND NEW.safety_score < (r.condition_params->>'min_score')::NUMERIC

        AND NOT EXISTS(
            SELECT 1 FROM triggered_alerts ta

            WHERE ta.rule_id = r.id

                AND ta.vehicle_id = NEW.vehicle_id
                AND ta.created_at > (NOW() - (debounce_minutes || ' minutes')::INTERVAL)
        );

        RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS safety_score_drop_trigger ON driver_daily_safety_scores;

CREATE TRIGGER safety_score_drop_trigger

AFTER INSERT OR UPDATE OF safety_score ON driver_daily_safety_scores

FOR EACH ROW

EXECUTE FUNCTION evaluate_safety_score_drop_rules();




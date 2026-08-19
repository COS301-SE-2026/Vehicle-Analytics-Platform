CREATE OR REPLACE FUNCTION evaluate_safety_score_drop_rules()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
   
    IF TG_OP = 'UPDATE' AND NEW.safety_score = OLD.safety_score THEN
        RETURN NEW;
    END IF;

    INSERT INTO triggered_alerts (

        rule_id, vehicle_id, fleet_group_id, condition_type, breach_value,
        threshold_value, created_at, rule_snapshot
    )

    SELECT 
        r.id, NEW.vehicle_id, r.fleet_group_id,
        'safety_score_drop',

        NEW.safety_score::TEXT,
        (r.condition_params->>'min_score'),

        NOW(),
        jsonb_build_object(

            'name', r.name,
            'condition_type', r.condition_type,
            'condition_params', r.condition_params,
            'priority', r.priority
        )

    FROM custom_alert_rules r
    WHERE r.fleet_group_id = NEW.fleet_group_id

        AND r.status = 'active'
        AND r.condition_type = 'safety_score_drop'
        AND NEW.safety_score < (r.condition_params->>'min_score')::NUMERIC

        AND NOT EXISTS(
            SELECT 1 FROM triggered_alerts ta

            WHERE ta.rule_id = r.id

                AND ta.vehicle_id = NEW.vehicle_id
                AND ta.created_at > (NOW() - (COALESCE(r.debounce_minutes, 5) || ' minutes')::INTERVAL)
                AND ta.status IN ('new', 'acknowledged')
        );

        RETURN NEW;
END;
$$;


-- Create trigger on driver_daily_safety_scores when safety_score is inserted/updated
CREATE TRIGGER safety_score_drop_trigger
AFTER INSERT OR UPDATE OF safety_score ON driver_daily_safety_scores
FOR EACH ROW
EXECUTE FUNCTION evaluate_safety_score_drop_rules();
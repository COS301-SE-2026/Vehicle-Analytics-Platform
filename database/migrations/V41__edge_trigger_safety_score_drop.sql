-- Migration: V41__edge_trigger_safety_score_drop.sql
-- Fixes evaluate_safety_score_drop_rules (originally defined in V33,
-- rewired to call alert_score_breach in V40) so it fires once per
-- crossing into breach instead of once per update while already
-- below the threshold.
--
-- Previously: any update where the new score breached the rule fired
-- an alert, gated only by a 5-minute debounce. A vehicle whose score
-- drifted 90 -> 50 -> 25 -> 0 over an hour got three separate alerts
-- for what is really one ongoing incident.
--
-- Now: an alert only fires when the vehicle transitions from
-- not-breaching into breaching (or on the very first score recorded
-- for that vehicle, if it starts out already below threshold). Once
-- it's already breaching, further drops don't re-fire. If the score
-- later recovers above the threshold and drops again, that's a new
-- crossing and will alert again, correctly.
--
-- V33's own file is untouched, since it already ran on the shared
-- database. This is a CREATE OR REPLACE only.

CREATE OR REPLACE FUNCTION evaluate_safety_score_drop_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_fleet_group_id BIGINT;
    v_old_score NUMERIC;

BEGIN

    IF TG_OP = 'UPDATE' AND NEW.safety_score = OLD.safety_score THEN
        RETURN NEW;
    END IF;

    v_old_score := CASE WHEN TG_OP = 'UPDATE' THEN OLD.safety_score ELSE NULL END;

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
        r.condition_params->>'min_score', NOW(),
        jsonb_build_object('name', r.name, 'condition_params', r.condition_params)

    FROM custom_alert_rules r
    WHERE r.fleet_group_id = v_fleet_group_id
        AND r.status = 'active'
        AND r.condition_type = 'safety_score_drop'
        AND alert_score_breach(NEW.safety_score, r.condition_params)
        AND (
            v_old_score IS NULL
            OR NOT alert_score_breach(v_old_score, r.condition_params)
        );

        RETURN NEW;
END;
$$;
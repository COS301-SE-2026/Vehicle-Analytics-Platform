-- Migration: V41__daily_cooldown_safety_score_drop.sql
-- Fixes evaluate_safety_score_drop_rules (originally defined in V33,
-- rewired to call alert_score_breach in V40) so it fires at most once
-- per vehicle per rule per day, instead of once per update while the
-- score is below threshold.
--
-- Decision (per team sync, resolving the open question in the Alert
-- Rule Backtesting meeting plan section 5.5): safety score drop uses
-- a once-per-day cooldown, not edge-crossing. This keeps the same
-- "debounce window" mechanism already used for speed/time (just a
-- 24h window instead of 5 minutes), so the backtest query only needs
-- to widen its own debounce window to match — no second, divergent
-- implementation of "don't re-fire" logic.
--
-- Previously: any update where the new score breached the rule fired
-- an alert, gated only by a 5-minute debounce. A vehicle whose score
-- drifted 90 -> 50 -> 25 -> 0 over an hour got three separate alerts
-- for what is really one ongoing incident.
--
-- Now: at most one alert per vehicle per rule per rolling 24 hours,
-- regardless of how many readings are below threshold in that window.

CREATE OR REPLACE FUNCTION evaluate_safety_score_drop_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    cooldown_hours INT := 24;
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
        r.condition_params->>'min_score', NOW(),
        jsonb_build_object('name', r.name, 'condition_params', r.condition_params)

    FROM custom_alert_rules r
    WHERE r.fleet_group_id = v_fleet_group_id
        AND r.status = 'active'
        AND r.condition_type = 'safety_score_drop'
        AND alert_score_breach(NEW.safety_score, r.condition_params)
        AND NOT EXISTS(
            SELECT 1 FROM triggered_alerts ta
            WHERE ta.rule_id = r.id
                AND ta.vehicle_id = NEW.vehicle_id
                AND ta.created_at > (NOW() - (cooldown_hours || ' hours')::INTERVAL)
        );

        RETURN NEW;
END;
$$;
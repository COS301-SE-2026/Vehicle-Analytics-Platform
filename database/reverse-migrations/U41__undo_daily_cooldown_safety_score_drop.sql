-- Reverts V41: back to the V40 behaviour (5-minute debounce). Keeps the
-- trigger function (the trigger depends on it) and only changes the cooldown.
CREATE OR REPLACE FUNCTION evaluate_safety_score_drop_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.safety_score = OLD.safety_score THEN
        RETURN NEW;
    END IF;

    PERFORM insert_safety_score_alerts(NEW.vehicle_id, NEW.safety_score, INTERVAL '5 minutes');
    RETURN NEW;
END;
$$;
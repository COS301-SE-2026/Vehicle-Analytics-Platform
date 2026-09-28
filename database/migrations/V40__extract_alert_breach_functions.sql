-- Migration: V40__extract_alert_breach_functions.sql
-- Extracts each custom alert rule's "is this a breach?" check out of its
-- trigger and into a standalone SQL function. The trigger and the backtest
-- feature both call the same function, so they can never disagree on what
-- counts as a breach.

CREATE OR REPLACE FUNCTION alert_speed_breach(p_speed NUMERIC, p_params JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$ 
    SELECT p_speed > (p_params->>'max_speed_kmh')::NUMERIC
$$;

CREATE OR REPLACE FUNCTION alert_time_breach(p_timestamp TIMESTAMPTZ, p_params JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$ 
    SELECT CASE
        WHEN  (p_params->>'start_time')::TIME > (p_params->>'end_time')::TIME THEN
            p_timestamp::TIME >= (p_params->>'start_time')::TIME
            OR p_timestamp::TIME < (p_params->>'end_time')::TIME
        ELSE
            p_timestamp::TIME >= (p_params->>'start_time')::TIME
            AND p_timestamp::TIME < (p_params->>'end_time')::TIME
        END
        AND (
            p_params->'restricted_days' IS NULL
            OR p_params->'restricted_days' ? to_char(p_timestamp, 'Dy')
        )
$$;


CREATE OR REPLACE FUNCTION alert_score_breach(p_score NUMERIC, p_params JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_score < (p_params->>'min_score')::NUMERIC
$$;

CREATE OR REPLACE FUNCTION alert_trip_duration_breach(
  p_duration_minutes NUMERIC,
  p_params JSONB,
  p_key TEXT DEFAULT 'max_trip_minutes'
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_params ? p_key)
    AND p_duration_minutes > (p_params->>p_key)::NUMERIC
$$;


CREATE OR REPLACE FUNCTION alert_unsafe_events_breach(p_event_count BIGINT, p_params JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_params ? 'count')
    AND p_event_count >= (p_params->>'count')::INT
$$;


CREATE OR REPLACE FUNCTION evaluate_custom_alert_rules_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    debounce_minutes     CONSTANT INT     := 5;
    status_active        CONSTANT TEXT    := 'active';
    key_name              CONSTANT TEXT   := 'name';
    key_condition_params  CONSTANT TEXT   := 'condition_params';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM custom_alert_rules WHERE status = status_active LIMIT 1)
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
            jsonb_build_object(key_name, r.name, key_condition_params, r.condition_params) AS rule_snapshot

        FROM latest_points lp
        JOIN vehicles v ON v.vehicle_id = lp.vehicle_id
        JOIN custom_alert_rules r
            ON r.fleet_group_id = v.fleet_group_id
            AND r.status = status_active
            AND r.condition_type = 'speed_threshold'
        WHERE alert_speed_breach(lp.speed, r.condition_params)
    ),

    time_breaches AS (
        SELECT
            r.id AS rule_id, lp.vehicle_id, r.fleet_group_id, r.condition_type,
            lp.time::TIME::TEXT AS breach_value,
            (r.condition_params->>'start_time') || '-' || (r.condition_params->>'end_time') AS threshold_value,
            lp.latitude, lp.longitude, lp.time,
            jsonb_build_object(key_name, r.name, key_condition_params, r.condition_params) AS rule_snapshot

        FROM latest_points lp
        JOIN vehicles v ON v.vehicle_id = lp.vehicle_id
        JOIN custom_alert_rules r
            ON r.fleet_group_id = v.fleet_group_id
            AND r.status = status_active
            AND r.condition_type = 'time_based_restriction'
        WHERE alert_time_breach(lp.time, r.condition_params)
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


-- Rewires evaluate_trip_duration_rules (originally defined in V35) to call
-- alert_trip_duration_breach instead of inline checks. CREATE OR REPLACE
CREATE OR REPLACE FUNCTION evaluate_trip_duration_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$

DECLARE
    status_active            CONSTANT TEXT   := 'active';
    status_open               CONSTANT TEXT  := 'open';
    status_completed           CONSTANT TEXT := 'completed';
    condition_trip_duration     CONSTANT TEXT := 'trip_duration_exceeded';
    key_name                      CONSTANT TEXT := 'name';
    key_condition_params           CONSTANT TEXT := 'condition_params';
    debounce_interval                CONSTANT TEXT := '5 minutes';

    v_fleet_group_id BIGINT;
    v_trip_minutes NUMERIC;
    v_daily_minutes NUMERIC;
    v_rule RECORD;

BEGIN

    IF NOT (OLD.status = status_open AND NEW.status = status_completed) THEN
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
          AND status = status_active
          AND condition_type = condition_trip_duration

    ) LOOP

        -- Check single-trip duration limit
        IF alert_trip_duration_breach(v_trip_minutes, v_rule.condition_params, 'max_trip_minutes') THEN

            INSERT INTO triggered_alerts(
                rule_id, vehicle_id, fleet_group_id, condition_type,
                breach_value, threshold_value, created_at, rule_snapshot
            )
            SELECT
                v_rule.id, NEW.vehicle_id, v_fleet_group_id, condition_trip_duration,
                round(v_trip_minutes)::TEXT,
                v_rule.condition_params->>'max_trip_minutes',
                NEW.end_time,
                jsonb_build_object(key_name, v_rule.name, key_condition_params, v_rule.condition_params)
            WHERE NOT EXISTS
            (
                SELECT 1 FROM triggered_alerts ta
                WHERE ta.rule_id = v_rule.id
                  AND ta.vehicle_id = NEW.vehicle_id
                  AND ta.created_at > (NEW.end_time - debounce_interval::INTERVAL)
            );

        END IF;

        -- Check same-day cumulative duration limit
        IF v_rule.condition_params ? 'max_daily_minutes' THEN

            SELECT SUM(duration_seconds) / 60.0
            INTO v_daily_minutes
            FROM trips
            WHERE vehicle_id = NEW.vehicle_id
              AND status = status_completed
              AND DATE(start_time) = DATE(NEW.start_time);

            IF alert_trip_duration_breach(v_daily_minutes, v_rule.condition_params, 'max_daily_minutes') THEN

                INSERT INTO triggered_alerts(
                    rule_id, vehicle_id, fleet_group_id, condition_type,
                    breach_value, threshold_value, created_at, rule_snapshot
                )
                SELECT
                    v_rule.id, NEW.vehicle_id, v_fleet_group_id, condition_trip_duration,
                    round(v_daily_minutes)::TEXT,
                    v_rule.condition_params->>'max_daily_minutes',
                    NEW.end_time,
                    jsonb_build_object(key_name, v_rule.name, key_condition_params, v_rule.condition_params)
                WHERE NOT EXISTS
                (
                    SELECT 1 FROM triggered_alerts ta
                    WHERE ta.rule_id = v_rule.id
                      AND ta.vehicle_id = NEW.vehicle_id
                      AND ta.created_at > (NEW.end_time - debounce_interval::INTERVAL)
                );

            END IF;
        END IF;

    END LOOP;

    RETURN NEW;
END;
$$;


-- Rewires evaluate_safety_score_drop_rules (originally defined in V33) to
-- call alert_score_breach instead of an inline check. CREATE OR REPLACE
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
                AND ta.created_at > (NOW() - (debounce_minutes || ' minutes')::INTERVAL)
        );

        RETURN NEW;
END;
$$;


-- Rewires evaluate_repeated_unsafe_events_rules (originally defined in V34)
-- to call alert_unsafe_events_breach instead of an inline count comparison.
-- CREATE OR REPLACE only — V34's file is untouched since it already ran on
-- the shared database.
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
            r.condition_params AS condition_params,
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
        SELECT rule_id, vehicle_id, fleet_group_id, condition_type,
               event_count, required_count, latitude, longitude, time, rule_snapshot
        FROM candidate_breaches cb
        WHERE alert_unsafe_events_breach(cb.event_count, cb.condition_params)
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
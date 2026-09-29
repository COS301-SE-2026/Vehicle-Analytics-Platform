-- V47: Fix the safety score pipeline

UPDATE vehicle_daily_events SET event_type = 'harsh_braking'
 WHERE event_type = 'harsh_brake';
UPDATE vehicle_daily_events SET event_type = 'harsh_cornering'
 WHERE event_type = 'harsh_corner';

-- 2. Trigger to append every score change to the history table
CREATE OR REPLACE FUNCTION log_safety_score_change() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO driver_safety_score_history (
        vehicle_id, score_date, safety_score,
        harsh_brakes, harsh_accelerations, harsh_cornering, crashes,
        total_events, classification, reason
    ) VALUES (
        NEW.vehicle_id, NEW.score_date, NEW.safety_score,
        NEW.harsh_brakes, NEW.harsh_accelerations, NEW.harsh_cornering,
        NEW.crashes, NEW.total_events, NEW.classification,
        CASE WHEN TG_OP = 'INSERT' THEN 'insert' ELSE 'update' END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_safety_score_change ON driver_daily_safety_scores;
CREATE TRIGGER trg_log_safety_score_change
AFTER INSERT OR UPDATE OF safety_score ON driver_daily_safety_scores
FOR EACH ROW
EXECUTE FUNCTION log_safety_score_change();

-- 3. Replace the delta trigger with corrected event names, lower weights,
--    and per-category daily caps so extreme volume doesn't dominate.
CREATE OR REPLACE FUNCTION apply_safety_score_delta_batch()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    WITH deltas AS (
        SELECT
            vehicle_id,
            event_time::DATE AS score_date,
            COUNT(*) FILTER (WHERE event_type IN ('harsh_braking','harsh_brake'))      AS d_brakes,
            COUNT(*) FILTER (WHERE event_type IN ('harsh_acceleration'))              AS d_accel,
            COUNT(*) FILTER (WHERE event_type IN ('harsh_cornering','harsh_corner'))  AS d_corner,
            COUNT(*) FILTER (WHERE event_type = 'crash')                              AS d_crash,
            COUNT(*)                                                                  AS d_total
        FROM new_events
        GROUP BY vehicle_id, event_time::DATE
    )
    INSERT INTO driver_daily_safety_scores (
        vehicle_id, score_date, safety_score,
        harsh_brakes, harsh_accelerations, harsh_cornering, crashes, total_events,
        classification, updated_at
    )
    SELECT
        d.vehicle_id, d.score_date, 100,
        d.d_brakes, d.d_accel, d.d_corner, d.d_crash, d.d_total,
        classify_safety_score(100),
        NOW()
    FROM deltas d
    ON CONFLICT (vehicle_id, score_date) DO UPDATE SET
        harsh_brakes        = driver_daily_safety_scores.harsh_brakes        + EXCLUDED.harsh_brakes,
        harsh_accelerations = driver_daily_safety_scores.harsh_accelerations + EXCLUDED.harsh_accelerations,
        harsh_cornering     = driver_daily_safety_scores.harsh_cornering     + EXCLUDED.harsh_cornering,
        crashes             = driver_daily_safety_scores.crashes             + EXCLUDED.crashes,
        total_events        = driver_daily_safety_scores.total_events        + EXCLUDED.total_events,
        updated_at          = NOW();

    UPDATE driver_daily_safety_scores dss
    SET safety_score = GREATEST(0, 100 - (
            LEAST(dss.harsh_brakes, 20)        * 1 +
            LEAST(dss.harsh_accelerations, 20) * 1 +
            LEAST(dss.harsh_cornering, 20)     * 1 +
            LEAST(dss.crashes, 3)              * 10)),
        classification = classify_safety_score(GREATEST(0, 100 - (
            LEAST(dss.harsh_brakes, 20)        * 1 +
            LEAST(dss.harsh_accelerations, 20) * 1 +
            LEAST(dss.harsh_cornering, 20)     * 1 +
            LEAST(dss.crashes, 3)              * 10)))
    FROM (SELECT DISTINCT vehicle_id, event_time::DATE AS score_date FROM new_events) touched
    WHERE dss.vehicle_id = touched.vehicle_id
      AND dss.score_date = touched.score_date;

    RETURN NULL;
END;
$$;

-- 4. Fix recompute_daily_safety_score (drop+create because the existing
--    function's parameter is named p_vehicle_id and CREATE OR REPLACE
--    cannot rename parameters)
DROP FUNCTION IF EXISTS recompute_daily_safety_score(text, date);

CREATE FUNCTION recompute_daily_safety_score(p_vehicle TEXT, p_date DATE)
RETURNS VOID AS $body$
DECLARE
    v_brakes INT; v_accel INT; v_corner INT; v_crash INT; v_total INT;
    v_score INT;
BEGIN
    SELECT
        COUNT(*) FILTER (WHERE event_detail = 'harsh_braking'),
        COUNT(*) FILTER (WHERE event_detail = 'harsh_acceleration'),
        COUNT(*) FILTER (WHERE event_detail = 'harsh_cornering'),
        COUNT(*) FILTER (WHERE event_category = 'crash_detection'
                           AND event_detail LIKE 'real crash detected%'
                           AND event_detail NOT LIKE '%not calibrated%'),
        COUNT(*)
    INTO v_brakes, v_accel, v_corner, v_crash, v_total
    FROM vehicle_events
    WHERE vehicle_id = p_vehicle
      AND (time AT TIME ZONE 'Africa/Johannesburg')::date = p_date;

    v_score := GREATEST(0, 100 - (
        LEAST(COALESCE(v_brakes,0), 20) * 1 +
        LEAST(COALESCE(v_accel,0),  20) * 1 +
        LEAST(COALESCE(v_corner,0), 20) * 1 +
        LEAST(COALESCE(v_crash,0),   3) * 10));

    INSERT INTO driver_daily_safety_scores (
        vehicle_id, score_date, safety_score,
        harsh_brakes, harsh_accelerations, harsh_cornering, crashes, total_events,
        classification, updated_at
    ) VALUES (
        p_vehicle, p_date, v_score,
        COALESCE(v_brakes,0), COALESCE(v_accel,0), COALESCE(v_corner,0),
        COALESCE(v_crash,0), COALESCE(v_total,0),
        classify_safety_score(v_score), NOW()
    )
    ON CONFLICT (vehicle_id, score_date) DO UPDATE SET
        safety_score        = EXCLUDED.safety_score,
        harsh_brakes        = EXCLUDED.harsh_brakes,
        harsh_accelerations = EXCLUDED.harsh_accelerations,
        harsh_cornering     = EXCLUDED.harsh_cornering,
        crashes             = EXCLUDED.crashes,
        total_events        = EXCLUDED.total_events,
        classification      = EXCLUDED.classification,
        updated_at          = NOW();
END;
$body$ LANGUAGE plpgsql;

DO $$
BEGIN
    RAISE NOTICE 'V47 applied. Weights 1/1/1/10 with caps 20/20/20/3.';
END $$;

-- Live safety scores.
--
-- This adds a trigger on vehicle_daily_events so the score updates in the
-- same transaction as the alert being written.
-- each day starts at 100
-- and penalties deduct from it 
--   harsh_brake 2, harsh_acceleration 2, harsh_cornering 1, crash 25
-- floored at 0.

CREATE OR REPLACE FUNCTION apply_safety_score_delta_batch()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    -- Ensure a row exists for every (vehicle, day) this batch touches,
    -- accumulating counts onto whatever is already there.
    WITH deltas AS (
        SELECT
            vehicle_id,
            event_time::DATE AS score_date,
            COUNT(*) FILTER (WHERE event_type = 'harsh_brake')        AS d_brakes,
            COUNT(*) FILTER (WHERE event_type = 'harsh_acceleration') AS d_accel,
            COUNT(*) FILTER (WHERE event_type = 'harsh_cornering')    AS d_corner,
            COUNT(*) FILTER (WHERE event_type = 'crash')              AS d_crash,
            COUNT(*)                                                  AS d_total
        FROM new_events
        GROUP BY vehicle_id, event_time::DATE
    )
    INSERT INTO driver_daily_safety_scores (
        vehicle_id, score_date, safety_score,
        harsh_brakes, harsh_accelerations, harsh_cornering, crashes, total_events,
        classification, updated_at
    )
    SELECT
        d.vehicle_id, d.score_date,
        100,         
        d.d_brakes, d.d_accel, d.d_corner, d.d_crash, d.d_total,
        'Excellent',  
        NOW()
    FROM deltas d
    ON CONFLICT (vehicle_id, score_date) DO UPDATE SET
        harsh_brakes        = driver_daily_safety_scores.harsh_brakes + EXCLUDED.harsh_brakes,
        harsh_accelerations = driver_daily_safety_scores.harsh_accelerations + EXCLUDED.harsh_accelerations,
        harsh_cornering     = driver_daily_safety_scores.harsh_cornering + EXCLUDED.harsh_cornering,
        crashes             = driver_daily_safety_scores.crashes + EXCLUDED.crashes,
        total_events        = driver_daily_safety_scores.total_events + EXCLUDED.total_events,
        updated_at          = NOW();

    UPDATE driver_daily_safety_scores dss
    SET safety_score = GREATEST(0, 100 - (
            dss.harsh_brakes * 2 + dss.harsh_accelerations * 2 +
            dss.harsh_cornering * 1 + dss.crashes * 25)),
        classification = classify_safety_score(GREATEST(0, 100 - (
            dss.harsh_brakes * 2 + dss.harsh_accelerations * 2 +
            dss.harsh_cornering * 1 + dss.crashes * 25)))
    FROM (SELECT DISTINCT vehicle_id, event_time::DATE AS score_date FROM new_events) touched
    WHERE dss.vehicle_id = touched.vehicle_id
      AND dss.score_date = touched.score_date;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_apply_safety_score_delta
AFTER INSERT ON vehicle_daily_events
REFERENCING NEW TABLE AS new_events
FOR EACH STATEMENT
EXECUTE FUNCTION apply_safety_score_delta_batch();


CREATE OR REPLACE FUNCTION get_current_safety_scores(
    p_vehicle_id TEXT DEFAULT NULL,
    p_date DATE DEFAULT NULL
)
RETURNS TABLE (
    vehicle_id TEXT,
    score_date DATE,
    safety_score INTEGER,
    harsh_brakes INTEGER,
    harsh_accelerations INTEGER,
    harsh_cornering INTEGER,
    crashes INTEGER,
    total_events INTEGER,
    classification VARCHAR(20),
    updated_at TIMESTAMPTZ
)
LANGUAGE sql STABLE AS $$
    SELECT vehicle_id, score_date, safety_score, harsh_brakes, harsh_accelerations,
           harsh_cornering, crashes, total_events, classification, updated_at
    FROM driver_daily_safety_scores
    WHERE score_date = COALESCE(p_date, CURRENT_DATE)
      AND (p_vehicle_id IS NULL OR vehicle_id = p_vehicle_id)
    ORDER BY vehicle_id;
$$;

-- A vehicle with no events today has no row yet, but its score IS 100 --
-- the day starts full and deducts. This returns every vehicle, defaulting
-- to a clean slate, so the frontend never has to decide whether a missing
-- row means "perfect" or "no data".
CREATE OR REPLACE FUNCTION get_current_safety_scores_all_vehicles(
    p_date DATE DEFAULT NULL
)
RETURNS TABLE (
    vehicle_id TEXT,
    score_date DATE,
    safety_score INTEGER,
    harsh_brakes INTEGER,
    harsh_accelerations INTEGER,
    harsh_cornering INTEGER,
    crashes INTEGER,
    total_events INTEGER,
    classification VARCHAR(20),
    updated_at TIMESTAMPTZ
)
LANGUAGE sql STABLE AS $$
    SELECT
        v.vehicle_id,
        COALESCE(p_date, CURRENT_DATE) AS score_date,
        COALESCE(s.safety_score, 100),
        COALESCE(s.harsh_brakes, 0),
        COALESCE(s.harsh_accelerations, 0),
        COALESCE(s.harsh_cornering, 0),
        COALESCE(s.crashes, 0),
        COALESCE(s.total_events, 0),
        COALESCE(s.classification, classify_safety_score(100)),
        s.updated_at
    FROM vehicles v
    LEFT JOIN driver_daily_safety_scores s
      ON s.vehicle_id = v.vehicle_id
     AND s.score_date = COALESCE(p_date, CURRENT_DATE)
    ORDER BY v.vehicle_id;
$$;

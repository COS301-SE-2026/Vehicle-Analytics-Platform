
-- V34: Lower Safety Score Penalties



-- Update V21
CREATE OR REPLACE FUNCTION apply_safety_score_delta_batch()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
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
            dss.harsh_brakes * 1 + dss.harsh_accelerations * 1 +
            dss.harsh_cornering * 1 + dss.crashes * 5)),
        classification = classify_safety_score(GREATEST(0, 100 - (
            dss.harsh_brakes * 1 + dss.harsh_accelerations * 1 +
            dss.harsh_cornering * 1 + dss.crashes * 5)))
    FROM (SELECT DISTINCT vehicle_id, event_time::DATE AS score_date FROM new_events) touched
    WHERE dss.vehicle_id = touched.vehicle_id
      AND dss.score_date = touched.score_date;

    RETURN NULL;
END;
$$;



CREATE OR REPLACE FUNCTION update_daily_safety_scores(p_date DATE DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    v_record RECORD;
    v_total_penalty INTEGER;
    v_count INTEGER := 0;
BEGIN
    FOR v_record IN SELECT DISTINCT vehicle_id FROM vehicles
    LOOP
        SELECT COALESCE(SUM(
            CASE
                WHEN event_detail = 'harsh_braking' THEN 1
                WHEN event_detail = 'harsh_acceleration' THEN 1
                WHEN event_detail = 'harsh_cornering' THEN 1
                WHEN event_category = 'crash_detection' THEN 5
                ELSE 0
            END
        ), 0) INTO v_total_penalty
        FROM vehicle_events
        WHERE vehicle_id = v_record.vehicle_id
          AND DATE(time) = p_date;

        INSERT INTO driver_daily_safety_scores (
            vehicle_id, score_date, safety_score,
            harsh_brakes, harsh_accelerations, harsh_cornering, crashes, total_events,
            classification
        )
        VALUES (
            v_record.vehicle_id, p_date,
            GREATEST(100 - v_total_penalty, 0),
            COALESCE((SELECT COUNT(*) FROM vehicle_events WHERE vehicle_id = v_record.vehicle_id AND DATE(time) = p_date AND event_detail = 'harsh_braking'), 0),
            COALESCE((SELECT COUNT(*) FROM vehicle_events WHERE vehicle_id = v_record.vehicle_id AND DATE(time) = p_date AND event_detail = 'harsh_acceleration'), 0),
            COALESCE((SELECT COUNT(*) FROM vehicle_events WHERE vehicle_id = v_record.vehicle_id AND DATE(time) = p_date AND event_detail = 'harsh_cornering'), 0),
            COALESCE((SELECT COUNT(*) FROM vehicle_events WHERE vehicle_id = v_record.vehicle_id AND DATE(time) = p_date AND event_category = 'crash_detection'), 0),
            COALESCE((SELECT COUNT(*) FROM vehicle_events WHERE vehicle_id = v_record.vehicle_id AND DATE(time) = p_date), 0),
            CASE
                WHEN GREATEST(100 - v_total_penalty, 0) >= 80 THEN 'Good'
                WHEN GREATEST(100 - v_total_penalty, 0) >= 50 THEN 'Fair'
                ELSE 'Poor'
            END
        )
        ON CONFLICT (vehicle_id, score_date)
        DO UPDATE SET
            safety_score = EXCLUDED.safety_score,
            harsh_brakes = EXCLUDED.harsh_brakes,
            harsh_accelerations = EXCLUDED.harsh_accelerations,
            harsh_cornering = EXCLUDED.harsh_cornering,
            crashes = EXCLUDED.crashes,
            total_events = EXCLUDED.total_events,
            classification = EXCLUDED.classification,
            updated_at = NOW();

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$function$;




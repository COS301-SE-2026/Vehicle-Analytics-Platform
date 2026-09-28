-- V48: Reseed driver_daily_safety_scores from vehicle_events

DELETE FROM driver_daily_safety_scores
WHERE score_date >= CURRENT_DATE - INTERVAL '30 days';

WITH daily AS (
    SELECT
        e.vehicle_id,
        (e.time AT TIME ZONE 'Africa/Johannesburg')::date AS score_date,
        COUNT(*) FILTER (WHERE e.event_detail = 'harsh_braking')      AS harsh_brakes,
        COUNT(*) FILTER (WHERE e.event_detail = 'harsh_acceleration') AS harsh_accelerations,
        COUNT(*) FILTER (WHERE e.event_detail = 'harsh_cornering')    AS harsh_cornering,
        COUNT(*) FILTER (WHERE e.event_category = 'crash_detection'
                           AND e.event_detail LIKE 'real crash detected%'
                           AND e.event_detail NOT LIKE '%not calibrated%') AS crashes,
        COUNT(*)                                                       AS total_events
    FROM vehicle_events e
    WHERE e.time >= CURRENT_DATE - INTERVAL '30 days'
      AND (
          (e.event_category = 'green_driving_type'
             AND e.event_detail IN ('harsh_braking','harsh_acceleration','harsh_cornering'))
       OR (e.event_category = 'crash_detection'
             AND e.event_detail LIKE 'real crash detected%'
             AND e.event_detail NOT LIKE '%not calibrated%')
      )
    GROUP BY e.vehicle_id, score_date
),
capped AS (
    SELECT vehicle_id, score_date,
        LEAST(harsh_brakes,        20) AS harsh_brakes,
        LEAST(harsh_accelerations, 20) AS harsh_accelerations,
        LEAST(harsh_cornering,     20) AS harsh_cornering,
        LEAST(crashes,              3) AS crashes,
        total_events
    FROM daily
),
scored AS (
    SELECT vehicle_id, score_date,
        harsh_brakes, harsh_accelerations, harsh_cornering, crashes, total_events,
        GREATEST(0, 100 - (harsh_brakes * 1
                         + harsh_accelerations * 1
                         + harsh_cornering * 1
                         + crashes * 10))::INTEGER AS safety_score
    FROM capped
)
INSERT INTO driver_daily_safety_scores (
    vehicle_id, score_date, safety_score,
    harsh_brakes, harsh_accelerations, harsh_cornering, crashes, total_events,
    classification, updated_at
)
SELECT vehicle_id, score_date, safety_score,
       harsh_brakes, harsh_accelerations, harsh_cornering, crashes, total_events,
       classify_safety_score(safety_score), NOW()
FROM scored
ON CONFLICT (vehicle_id, score_date) DO UPDATE SET
    safety_score        = EXCLUDED.safety_score,
    harsh_brakes        = EXCLUDED.harsh_brakes,
    harsh_accelerations = EXCLUDED.harsh_accelerations,
    harsh_cornering     = EXCLUDED.harsh_cornering,
    crashes             = EXCLUDED.crashes,
    total_events        = EXCLUDED.total_events,
    classification      = EXCLUDED.classification,
    updated_at          = NOW();

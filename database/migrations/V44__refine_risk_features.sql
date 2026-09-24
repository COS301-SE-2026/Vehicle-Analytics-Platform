-- NOSONAR: migration file, literal repetition is idiomatic for SQL


-- V44: Predictive risk feature engineering (v2)


DROP VIEW IF EXISTS vehicle_risk_features;

CREATE OR REPLACE VIEW vehicle_risk_features AS
WITH
  safety_30 AS (
    SELECT vehicle_id,
           AVG(safety_score)::numeric AS avg_safety
    FROM driver_daily_safety_scores
    WHERE score_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY vehicle_id
  ),
  harsh_30 AS (
    SELECT vehicle_id,
           SUM(harsh_brakes + harsh_accelerations + harsh_cornering)::numeric AS total_harsh
    FROM driver_daily_safety_scores
    WHERE score_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY vehicle_id
  ),
  trips_30 AS (
    SELECT vehicle_id,
           COUNT(*)::numeric                                          AS trip_count,
           COALESCE(SUM(distance_km), 0)::numeric                     AS total_distance,
           COALESCE(
             AVG(CASE WHEN max_speed_kmh > 100 THEN 1 ELSE 0 END),
             0
           )::numeric                                                 AS speeding_ratio,
           COALESCE(
             AVG(CASE WHEN EXTRACT(DOW FROM start_time) IN (0,6) THEN 1 ELSE 0 END),
             0
           )::numeric                                                 AS weekend_ratio,
           MAX(end_time)                                              AS last_trip_end
    FROM trips
    WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
      AND status = 'completed'
    GROUP BY vehicle_id
  )
SELECT
    v.vehicle_id,
    COALESCE(s30.avg_safety, 100)::numeric                            AS safety_feature,
    CASE
      WHEN COALESCE(t30.trip_count, 0) > 0
        THEN (COALESCE(h30.total_harsh, 0) / t30.trip_count)
      ELSE 0
    END::numeric                                                     AS harsh_feature,
    COALESCE(t30.speeding_ratio, 0)::numeric                         AS speeding_feature,
    COALESCE(t30.weekend_ratio, 0)::numeric                          AS weekend_feature,
    COALESCE(t30.total_distance, 0)::numeric                         AS distance_feature,
    COALESCE(
      EXTRACT(DAY FROM (NOW() - t30.last_trip_end)),
      999
    )::numeric                                                       AS recency_feature
FROM vehicles v
LEFT JOIN safety_30 s30 ON s30.vehicle_id = v.vehicle_id
LEFT JOIN harsh_30  h30 ON h30.vehicle_id = v.vehicle_id
LEFT JOIN trips_30  t30 ON t30.vehicle_id = v.vehicle_id;

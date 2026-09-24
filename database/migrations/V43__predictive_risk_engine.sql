

-- V43: Predictive Risk Intelligence Engine

CREATE TABLE IF NOT EXISTS risk_model_weights (
    id                SERIAL PRIMARY KEY,
    trained_at        TIMESTAMPTZ DEFAULT NOW(),
    training_rows     INTEGER NOT NULL,
    training_days     INTEGER NOT NULL,
    intercept         NUMERIC(12,8) NOT NULL,
    w_safety          NUMERIC(12,8) NOT NULL,
    w_harsh           NUMERIC(12,8) NOT NULL,
    w_crashes         NUMERIC(12,8) NOT NULL,
    w_speeding        NUMERIC(12,8) NOT NULL,
    w_weekend         NUMERIC(12,8) NOT NULL,
    mean_safety       NUMERIC(12,8) NOT NULL,
    std_safety        NUMERIC(12,8) NOT NULL,
    mean_harsh        NUMERIC(12,8) NOT NULL,
    std_harsh         NUMERIC(12,8) NOT NULL,
    mean_crashes      NUMERIC(12,8) NOT NULL,
    std_crashes       NUMERIC(12,8) NOT NULL,
    mean_speeding     NUMERIC(12,8) NOT NULL,
    std_speeding      NUMERIC(12,8) NOT NULL,
    mean_weekend      NUMERIC(12,8) NOT NULL,
    std_weekend       NUMERIC(12,8) NOT NULL,
    precision_at_high NUMERIC(6,4),
    recall_at_high    NUMERIC(6,4)
);



CREATE TABLE IF NOT EXISTS vehicle_risk_predictions (
    id                SERIAL PRIMARY KEY,
    vehicle_id        TEXT NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    prediction_date   DATE NOT NULL,
    risk_score        NUMERIC(5,2) NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    risk_tier         TEXT NOT NULL CHECK (risk_tier IN ('low','medium','high','critical')),
    feature_safety    NUMERIC(10,4) NOT NULL,
    feature_harsh     NUMERIC(10,4) NOT NULL,
    feature_crashes   NUMERIC(10,4) NOT NULL,
    feature_speeding  NUMERIC(10,4) NOT NULL,
    feature_weekend   NUMERIC(10,4) NOT NULL,
    top_factors       JSONB NOT NULL DEFAULT '[]'::jsonb,
    model_version     INTEGER,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (vehicle_id, prediction_date)
);

CREATE INDEX IF NOT EXISTS idx_risk_pred_vehicle_date
    ON vehicle_risk_predictions (vehicle_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_risk_pred_tier
    ON vehicle_risk_predictions (risk_tier, prediction_date DESC);



CREATE TABLE IF NOT EXISTS coaching_interventions (
    id                  SERIAL PRIMARY KEY,
    vehicle_id          TEXT NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    triggered_by_date   DATE NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    recommendation_text TEXT NOT NULL,
    primary_factor      TEXT NOT NULL,
    risk_score_before   NUMERIC(5,2) NOT NULL,
    risk_score_after_7d NUMERIC(5,2),
    outcome_delta       NUMERIC(6,2),
    outcome_measured_at TIMESTAMPTZ,
    UNIQUE (vehicle_id, triggered_by_date)
);

CREATE INDEX IF NOT EXISTS idx_coaching_vehicle
    ON coaching_interventions (vehicle_id, created_at DESC);



CREATE TABLE IF NOT EXISTS risk_notification_log (
    id                SERIAL PRIMARY KEY,
    vehicle_id        TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    message           TEXT NOT NULL,
    risk_tier         TEXT NOT NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    acknowledged      BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_risk_notif_created
    ON risk_notification_log (created_at DESC);



CREATE OR REPLACE VIEW vehicle_risk_features AS
WITH
  last_7 AS (
    SELECT vehicle_id,
           AVG(safety_score)::numeric AS avg_safety,
           AVG(harsh_brakes + harsh_accelerations + harsh_cornering)::numeric AS avg_harsh,
           AVG(CASE WHEN (harsh_brakes + harsh_accelerations + harsh_cornering) > 0 THEN 1 ELSE 0 END)::numeric AS speeding_ratio
    FROM driver_daily_safety_scores
    WHERE score_date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY vehicle_id
  ),
  last_30 AS (
    SELECT vehicle_id,
           SUM(crashes)::numeric AS total_crashes
    FROM driver_daily_safety_scores
    WHERE score_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY vehicle_id
  ),
  trips_7 AS (
    SELECT vehicle_id,
           COALESCE(AVG(CASE WHEN EXTRACT(DOW FROM start_time) IN (0,6) THEN 1 ELSE 0 END), 0)::numeric AS weekend_ratio
    FROM trips
    WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
      AND status = 'completed'
    GROUP BY vehicle_id
  )
SELECT
    v.vehicle_id,
    COALESCE(l7.avg_safety, 100)      AS safety_feature,
    COALESCE(l7.avg_harsh, 0)         AS harsh_feature,
    COALESCE(l30.total_crashes, 0)    AS crashes_feature,
    COALESCE(l7.speeding_ratio, 0)    AS speeding_feature,
    COALESCE(t7.weekend_ratio, 0)     AS weekend_feature
FROM vehicles v
LEFT JOIN last_7   l7  ON l7.vehicle_id  = v.vehicle_id
LEFT JOIN last_30  l30 ON l30.vehicle_id = v.vehicle_id
LEFT JOIN trips_7  t7  ON t7.vehicle_id  = v.vehicle_id;

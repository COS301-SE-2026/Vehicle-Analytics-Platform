-- V46: Add distance and recency feature columns to risk predictions


ALTER TABLE vehicle_risk_predictions
  ADD COLUMN IF NOT EXISTS feature_distance NUMERIC(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feature_recency  NUMERIC(10,4) NOT NULL DEFAULT 0;

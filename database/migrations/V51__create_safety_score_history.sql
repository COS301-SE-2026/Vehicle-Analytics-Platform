-- V51: Create driver_safety_score_history if it does not exist


CREATE TABLE IF NOT EXISTS driver_safety_score_history (
    id                  BIGSERIAL PRIMARY KEY,
    vehicle_id          TEXT NOT NULL,
    score_date          DATE NOT NULL,
    safety_score        INTEGER NOT NULL,
    harsh_brakes        INTEGER NOT NULL DEFAULT 0,
    harsh_accelerations INTEGER NOT NULL DEFAULT 0,
    harsh_cornering     INTEGER NOT NULL DEFAULT 0,
    crashes             INTEGER NOT NULL DEFAULT 0,
    total_events        INTEGER NOT NULL DEFAULT 0,
    classification      VARCHAR(20),
    reason              TEXT,
    recorded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dssh_vehicle_date
    ON driver_safety_score_history(vehicle_id, score_date DESC);

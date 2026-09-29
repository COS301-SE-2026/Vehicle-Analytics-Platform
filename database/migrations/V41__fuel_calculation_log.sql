
-- V35: Fuel Efficiency Calculation Log


CREATE TABLE IF NOT EXISTS fuel_calculation_log (
    id SERIAL PRIMARY KEY,
    run_at TIMESTAMPTZ DEFAULT NOW(),
    vehicles_processed INTEGER DEFAULT 0,
    vehicles_failed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_fuel_calc_log_run_at
    ON fuel_calculation_log (run_at DESC);

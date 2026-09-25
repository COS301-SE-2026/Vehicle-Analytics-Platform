CREATE INDEX IF NOT EXISTS idx_clean_telemetry_speeding
ON clean_telemetry (speed, vehicle_id, time)
WHERE speed > 40;
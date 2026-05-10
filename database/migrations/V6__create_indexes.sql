-- Speed up map queries
CREATE INDEX IF NOT EXISTS idx_clean_telemetry_vehicle_time
  ON clean_telemetry (vehicle_id, time DESC);

-- Speed up event queries
CREATE INDEX IF NOT EXISTS idx_vehicle_events_vehicle_time
  ON vehicle_events (vehicle_id, time DESC);

-- Speed up event type filtering
CREATE INDEX IF NOT EXISTS idx_vehicle_events_detail
  ON vehicle_events (event_detail);

-- Speed up raw telemetry lookups
CREATE INDEX IF NOT EXISTS idx_raw_telemetry_vehicle_time
  ON raw_telemetry (vehicle_id, time DESC);
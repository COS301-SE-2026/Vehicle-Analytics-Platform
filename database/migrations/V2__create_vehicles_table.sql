CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id    TEXT PRIMARY KEY,
  device_id     TEXT UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

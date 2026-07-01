CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id    VARCHAR(50) PRIMARY KEY,
  device_id     VARCHAR(50) UNIQUE,
  status        VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'maintenance')),
  driver_name   VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
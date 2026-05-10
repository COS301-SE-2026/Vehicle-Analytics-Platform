CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id    VARCHAR(50) PRIMARY KEY,
  device_id     VARCHAR(50) UNIQUE,
  license_plate VARCHAR(20),
  make          VARCHAR(50),
  model         VARCHAR(50),
  status        VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'maintenance')),
  driver_name   VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
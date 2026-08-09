CREATE TABLE IF NOT EXISTS clean_telemetry (
    time TIMESTAMPTZ NOT NULL,
    vehicle_id TEXT NOT NULL,
    device_id TEXT,
    measurement TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    speed INTEGER,
    total_odometer BIGINT,
    ignition TEXT,
    movement TEXT,
    location GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    UNIQUE (time, vehicle_id, measurement)
);

CREATE TABLE IF NOT EXISTS vehicle_events (
    time TIMESTAMPTZ NOT NULL,
    vehicle_id TEXT NOT NULL,
    device_id TEXT,
    event_category TEXT,      -- e.g., 'ignition', 'green_driving_type', 'crash_detection'
    event_detail TEXT,        -- e.g., 'harsh_acceleration', 'Ignition On'
    latitude NUMERIC,
    longitude NUMERIC,
    speed INTEGER,
    total_odometer BIGINT,
    ignition TEXT,
    movement TEXT,
    location GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    UNIQUE (time, vehicle_id, event_category)
);

CREATE TABLE IF NOT EXISTS telemetry_errors (
    id SERIAL PRIMARY KEY,
    time TIMESTAMPTZ DEFAULT NOW(),
    vehicle_id TEXT,
    error_message TEXT,
    raw_payload TEXT,
    synced_to_cloudwatch BOOLEAN DEFAULT FALSE
);

SELECT create_hypertable('clean_telemetry', by_range('time'));
SELECT create_hypertable('vehicle_events', by_range('time'));

-- Map/breadcrumb queries by vehicle + time window
CREATE INDEX IF NOT EXISTS idx_clean_telemetry_vehicle_time
  ON clean_telemetry (vehicle_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_clean_telemetry_location
  ON clean_telemetry USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_vehicle_events_vehicle_time
  ON vehicle_events (vehicle_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_events_detail
  ON vehicle_events (event_detail);

CREATE INDEX IF NOT EXISTS idx_vehicle_events_location
  ON vehicle_events USING GIST (location);
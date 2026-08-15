CREATE TABLE IF NOT EXISTS raw_telemetry (
    time TIMESTAMPTZ NOT NULL,
    vehicle_id TEXT NOT NULL,
    measurement TEXT,
    device_id TEXT,
    event TEXT,
    lat_lng TEXT,
    spd TEXT,
    total_odometer TEXT,
    ignition TEXT,
    movement TEXT,
    green_driving_type TEXT,
    crash_detection TEXT,
    UNIQUE (time, vehicle_id, measurement, event)
);

SELECT create_hypertable('raw_telemetry', by_range('time'));

CREATE INDEX IF NOT EXISTS idx_raw_telemetry_vehicle_time
  ON raw_telemetry (vehicle_id, time DESC);

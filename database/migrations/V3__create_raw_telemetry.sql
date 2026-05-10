CREATE TABLE IF NOT EXISTS raw_telemetry (
    time TIMESTAMPTZ NOT NULL,
    vehicle_id VARCHAR(50) NOT NULL,
    measurement VARCHAR(50),
    device_id VARCHAR(50),
    event VARCHAR(50),
    lat_lng VARCHAR(50),
    spd VARCHAR(20),
    total_odometer VARCHAR(50),
    ignition VARCHAR(50),
    movement VARCHAR(50),
    green_driving_type VARCHAR(50),
    crash_detection VARCHAR(50),
    UNIQUE (time, vehicle_id)
);

-- Convert it to a TimescaleDB hypertable partitioned by time
SELECT create_hypertable('raw_telemetry', by_range('time'));

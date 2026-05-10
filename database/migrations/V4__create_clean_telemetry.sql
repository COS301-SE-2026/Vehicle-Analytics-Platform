CREATE TABLE IF NOT EXISTS clean_telemetry (
    time TIMESTAMPTZ NOT NULL,
    vehicle_id VARCHAR(50) NOT NULL,
    device_id VARCHAR(50),
    measurement VARCHAR(50),
    latitude NUMERIC,
    longitude NUMERIC,
    speed INTEGER,
    total_odometer BIGINT,
    UNIQUE (time, vehicle_id)
);

CREATE TABLE IF NOT EXISTS vehicle_events (
    time TIMESTAMPTZ NOT NULL,
    vehicle_id VARCHAR(50) NOT NULL,
    event_category VARCHAR(50),      -- e.g., 'ignition', 'green_driving_type'
    event_detail VARCHAR(50),        -- e.g., 'harsh_acceleration', 'Ignition On'
    latitude NUMERIC,
    longitude NUMERIC,
    speed INTEGER,
    UNIQUE (time, vehicle_id, event_category)
);

CREATE TABLE IF NOT EXISTS telemetry_errors (
    id SERIAL PRIMARY KEY,
    time TIMESTAMPTZ DEFAULT NOW(),
    vehicle_id VARCHAR(50),
    error_message TEXT,
    raw_payload TEXT,
    synced_to_cloudwatch BOOLEAN DEFAULT FALSE
);

-- Convert both to TimescaleDB hypertables
SELECT create_hypertable('clean_telemetry', by_range('time'));
SELECT create_hypertable('vehicle_events', by_range('time'));

-- Create the parsing function
CREATE OR REPLACE FUNCTION parse_and_insert_telemetry()
RETURNS TRIGGER AS $$
DECLARE
    parsed_lat NUMERIC := NULL;
    parsed_lng NUMERIC := NULL;
    parsed_speed INTEGER := NULL;
BEGIN
    -- 0. Auto-register the vehicle if it's new
    INSERT INTO vehicles (vehicle_id, device_id)
    VALUES (NEW.vehicle_id, NEW.device_id)
    ON CONFLICT DO NOTHING;

    -- 1. Safely parse numbers
    IF NEW.lat_lng IS NOT NULL AND position(',' in NEW.lat_lng) > 0 THEN
        parsed_lat := CAST(split_part(NEW.lat_lng, ',', 1) AS NUMERIC);
        parsed_lng := CAST(split_part(NEW.lat_lng, ',', 2) AS NUMERIC);
    END IF;
    parsed_speed := NULLIF(NEW.spd, '')::INTEGER;

    -- 2. ALL records go into continuous clean_telemetry for breadcrumb routes
    INSERT INTO clean_telemetry (
        time, vehicle_id, device_id, measurement, latitude, longitude, speed, total_odometer
    ) VALUES (
        NEW.time, NEW.vehicle_id, NEW.device_id, NEW.measurement,
        parsed_lat, parsed_lng, parsed_speed, NULLIF(NEW.total_odometer, '')::BIGINT
    ) ON CONFLICT (time, vehicle_id) DO NOTHING;

    -- 3. If it's a safety trigger (avl_event), ALSO put it in the dedicated vehicle_events table
    IF NEW.measurement = 'avl_event' THEN
        INSERT INTO vehicle_events (
            time, vehicle_id, event_category, event_detail, latitude, longitude, speed
        ) VALUES (
            NEW.time, 
            NEW.vehicle_id, 
            NEW.event,
            -- Determine the specific detail based on the event type
            CASE 
                WHEN NEW.event = 'green_driving_type' THEN NEW.green_driving_type
                WHEN NEW.event = 'crash_detection' THEN NEW.crash_detection
                WHEN NEW.event = 'ignition' THEN NEW.ignition
                ELSE NULL
            END,
            parsed_lat, 
            parsed_lng, 
            parsed_speed
        ) ON CONFLICT (time, vehicle_id, event_category) DO NOTHING;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO telemetry_errors (vehicle_id, error_message, raw_payload)
    VALUES (NEW.vehicle_id, SQLERRM, row_to_json(NEW)::TEXT);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger
CREATE TRIGGER trigger_parse_raw_telemetry
AFTER INSERT ON raw_telemetry
FOR EACH ROW
EXECUTE FUNCTION parse_and_insert_telemetry();

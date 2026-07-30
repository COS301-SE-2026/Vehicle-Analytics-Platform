DROP TRIGGER IF EXISTS trigger_parse_telemetry ON raw_telemetry;
DROP FUNCTION IF EXISTS parse_telemetry();
DROP TABLE IF EXISTS telemetry_errors CASCADE;
DROP TABLE IF EXISTS vehicle_events CASCADE;
DROP TABLE IF EXISTS clean_telemetry CASCADE;
DROP TRIGGER IF EXISTS trip_duration_alert_trigger ON clean_telemetry;

DROP FUNCTION IF EXISTS evaluate_trip_duration_rules();
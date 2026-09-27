DROP TRIGGER IF EXISTS repeated_unsafe_events_trigger ON clean_telemetry;

DROP FUNCTION IF EXISTS evaluate_repeated_unsafe_events_rules();

DROP TRIGGER IF EXISTS geofence_event_trigger ON clean_telemetry;
DROP FUNCTION IF EXISTS process_geofence_events();
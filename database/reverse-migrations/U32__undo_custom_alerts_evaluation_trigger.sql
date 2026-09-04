DROP TRIGGER IF EXISTS custom_alert_evaluation_trigger ON clean_telemetry;
 
DROP FUNCTION IF EXISTS evaluate_custom_alert_rules_batch();
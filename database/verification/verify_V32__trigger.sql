-- Manual verification for V32__create_custom_alert_evaluation_trigger.sql
-- Run this against your local dev DB (NOT test/CI) after applying V32.
-- Cleans up after itself at the end.
\set ON_ERROR_STOP on
BEGIN;
-- 1. Set up a manager, fleet group, assignment, and vehicle
INSERT INTO users (cognito_sub, name, email, role)
VALUES ('VERIFY-sub-1', 'Verify Manager', 'verify-manager@example.com', 'fleet_manager')
RETURNING id AS manager_id \gset
INSERT INTO fleet_groups (name)
VALUES ('VERIFY-Group')
RETURNING id AS group_id \gset
INSERT INTO fleet_manager_assignments (fleet_manager_id, fleet_group_id, assigned_by)
VALUES (:manager_id, :group_id, :manager_id);
INSERT INTO vehicles (vehicle_id, fleet_group_id)
VALUES ('VERIFY-VEH-1', :group_id)
ON CONFLICT (vehicle_id) DO UPDATE SET fleet_group_id = :group_id;
-- 2. Create a speed_threshold rule: alert if speed > 100 km/h
INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
VALUES (:manager_id, :group_id, 'VERIFY-Speed-Rule', 'speed_threshold', '{"max_speed_kmh": 100}')
RETURNING id AS speed_rule_id \gset
-- 3. Create a time_based_restriction rule: alert if driving 22:00-05:00
INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
VALUES (:manager_id, :group_id, 'VERIFY-Time-Rule', 'time_based_restriction', '{"start_time": "22:00", "end_time": "05:00"}')
RETURNING id AS time_rule_id \gset
-- 4. Insert a telemetry point that SHOULD breach speed_threshold (150 km/h, at a neutral time e.g. noon)
INSERT INTO clean_telemetry (time, vehicle_id, latitude, longitude, speed)
VALUES (CURRENT_DATE + TIME '12:00:00', 'VERIFY-VEH-1', -25.0, 28.0, 150);
-- 5. Check: did a speed_threshold triggered_alert get created?
\echo '--- Expect 1 row: speed_threshold breach ---'
SELECT rule_id, vehicle_id, condition_type, breach_value, threshold_value
FROM triggered_alerts
WHERE rule_id = :speed_rule_id AND vehicle_id = 'VERIFY-VEH-1';
-- 6. Insert a SECOND breaching point immediately after — should be debounced (no new row)
INSERT INTO clean_telemetry (time, vehicle_id, latitude, longitude, speed)
VALUES (CURRENT_DATE + TIME '12:01:00', 'VERIFY-VEH-1', -25.0, 28.0, 160);
\echo '--- Expect still 1 row (debounced): speed_threshold breach ---'
SELECT COUNT(*) AS speed_alert_count
FROM triggered_alerts
WHERE rule_id = :speed_rule_id AND vehicle_id = 'VERIFY-VEH-1';
-- 7. Insert a telemetry point that SHOULD breach time_based_restriction (23:00, within 22:00-05:00 window)
INSERT INTO clean_telemetry (time, vehicle_id, latitude, longitude, speed)
VALUES (CURRENT_DATE + TIME '23:00:00', 'VERIFY-VEH-1', -25.0, 28.0, 60);
\echo '--- Expect 1 row: time_based_restriction breach ---'
SELECT rule_id, vehicle_id, condition_type, breach_value, threshold_value
FROM triggered_alerts
WHERE rule_id = :time_rule_id AND vehicle_id = 'VERIFY-VEH-1';
-- 8. Insert a telemetry point that should NOT breach anything (60 km/h, 12:00 noon)
INSERT INTO clean_telemetry (time, vehicle_id, latitude, longitude, speed)
VALUES (CURRENT_DATE + TIME '14:00:00', 'VERIFY-VEH-1', -25.0, 28.0, 60);
\echo '--- Expect 0 additional rows beyond the 2 above (total should still be 2) ---'
SELECT COUNT(*) AS total_alerts
FROM triggered_alerts ta
JOIN custom_alert_rules r ON r.id = ta.rule_id
WHERE r.name LIKE 'VERIFY-%';
-- Roll back everything — this script never leaves test data behind
ROLLBACK;
\echo '--- Verification complete, all test data rolled back ---'    where woukd i place this file locally, without commiting it to check for my V32 migration/
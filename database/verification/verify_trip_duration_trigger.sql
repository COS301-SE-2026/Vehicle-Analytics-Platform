-- Manual verification for the rewired evaluate_trip_duration_rules()
-- (now calls alert_trip_duration_breach instead of inline checks).
-- Run against your local/shared dev DB. Everything rolls back at the end.

\i verify_common_setup.sql

-- Create a trip_duration_exceeded rule: alert if a single trip > 120 min
INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
VALUES (:manager_id, :group_id, 'VERIFY-TripDuration-Rule', 'trip_duration_exceeded', '{"max_trip_minutes": 120}')
RETURNING id AS trip_rule_id \gset

-- Insert a trip that should NOT breach yet (status still 'open')
INSERT INTO trips (vehicle_id, status, start_time, end_time, duration_seconds)
VALUES (:'vehicle_id', 'open', NOW() - INTERVAL '3 hours', NULL, NULL)
RETURNING trip_id \gset

\echo '--- Expect 0 rows: trip still open, trigger only fires on open -> completed ---'
SELECT COUNT(*) AS alert_count_while_open
FROM triggered_alerts
WHERE rule_id = :trip_rule_id AND vehicle_id = :'vehicle_id';

-- Complete the trip with a duration that SHOULD breach (150 min > 120 min limit)
UPDATE trips
SET status = 'completed',
    end_time = start_time + INTERVAL '150 minutes',
    duration_seconds = 150 * 60
WHERE trip_id = :trip_id;

\echo '--- Expect 1 row: single-trip duration breach ---'
SELECT rule_id, vehicle_id, condition_type, breach_value, threshold_value
FROM triggered_alerts
WHERE rule_id = :trip_rule_id AND vehicle_id = :'vehicle_id';

-- A second trip on the same day that should NOT individually breach
-- (60 min < 120 min limit) but IS included if you also test max_daily_minutes
INSERT INTO trips (vehicle_id, status, start_time, end_time, duration_seconds)
VALUES (:'vehicle_id', 'open', NOW() - INTERVAL '1 hour', NULL, NULL)
RETURNING trip_id AS trip_id_2 \gset

UPDATE trips
SET status = 'completed',
    end_time = start_time + INTERVAL '60 minutes',
    duration_seconds = 60 * 60
WHERE trip_id = :trip_id_2;

\echo '--- Expect still 1 row total (60 min trip does not breach the 120 min single-trip limit) ---'
SELECT COUNT(*) AS total_alerts
FROM triggered_alerts
WHERE rule_id = :trip_rule_id AND vehicle_id = :'vehicle_id';

ROLLBACK;
\echo '--- Verification complete, all test data rolled back ---'
\i verify_common_cleanup.sql
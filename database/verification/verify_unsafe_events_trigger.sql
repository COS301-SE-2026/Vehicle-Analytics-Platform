-- Manual verification for the rewired evaluate_repeated_unsafe_events_rules()
-- (now calls alert_unsafe_events_breach instead of inline count comparison).
-- Run against your local/shared dev DB. Everything rolls back at the end.

\i verify_common_setup.sql

-- Create a repeated_unsafe_events rule: alert if 3+ harsh_braking events
-- happen within a 30-minute window
INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
VALUES (
  :manager_id, :group_id, 'VERIFY-UnsafeEvents-Rule', 'repeated_unsafe_events',
  '{"event_types": ["harsh_braking"], "count": 3, "window_minutes": 30}'
)
RETURNING id AS unsafe_rule_id \gset

-- Insert 2 harsh_braking events within the window — should NOT breach yet (2 < 3)
INSERT INTO vehicle_events (vehicle_id, event_detail, time, latitude, longitude)
VALUES
  (:'vehicle_id', 'harsh_braking', NOW() - INTERVAL '20 minutes', -25.0, 28.0),
  (:'vehicle_id', 'harsh_braking', NOW() - INTERVAL '10 minutes', -25.0, 28.0);

\echo '--- Expect 0 rows: only 2 of 3 required events so far ---'
SELECT COUNT(*) AS alert_count_below_required
FROM triggered_alerts
WHERE rule_id = :unsafe_rule_id AND vehicle_id = :'vehicle_id';

-- A 3rd harsh_braking event within the same 30-minute window — SHOULD breach
INSERT INTO vehicle_events (vehicle_id, event_detail, time, latitude, longitude)
VALUES (:'vehicle_id', 'harsh_braking', NOW(), -25.0, 28.0);

\echo '--- Expect 1 row: 3rd event within window triggers the breach ---'
SELECT rule_id, vehicle_id, condition_type, breach_value, threshold_value
FROM triggered_alerts
WHERE rule_id = :unsafe_rule_id AND vehicle_id = :'vehicle_id';

-- An event type NOT in event_types (harsh_cornering) — should be ignored
-- entirely, even though it's a genuinely unsafe event
INSERT INTO vehicle_events (vehicle_id, event_detail, time, latitude, longitude)
VALUES (:'vehicle_id', 'harsh_cornering', NOW(), -25.0, 28.0);

\echo '--- Expect still 1 row: harsh_cornering is not in this rule''s event_types ---'
SELECT COUNT(*) AS total_alerts
FROM triggered_alerts
WHERE rule_id = :unsafe_rule_id AND vehicle_id = :'vehicle_id';

ROLLBACK;
\echo '--- Verification complete, all test data rolled back ---'
\i verify_common_cleanup.sql
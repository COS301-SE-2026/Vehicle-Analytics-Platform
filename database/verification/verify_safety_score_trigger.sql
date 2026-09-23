-- Manual verification for the rewired evaluate_safety_score_drop_rules()
-- (now calls alert_score_breach instead of inline check).
-- Run against your local/shared dev DB. Everything rolls back at the end.

\i verify_common_setup.sql

-- Create a safety_score_drop rule: alert if score falls below 60
INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
VALUES (:manager_id, :group_id, 'VERIFY-SafetyScore-Rule', 'safety_score_drop', '{"min_score": 60}')
RETURNING id AS score_rule_id \gset

-- Insert a daily score that should NOT breach (75 >= 60)
INSERT INTO driver_daily_safety_scores (vehicle_id, score_date, safety_score)
VALUES (:'vehicle_id', CURRENT_DATE, 75);

\echo '--- Expect 0 rows: score above threshold ---'
SELECT COUNT(*) AS alert_count_above_threshold
FROM triggered_alerts
WHERE rule_id = :score_rule_id AND vehicle_id = :'vehicle_id';

-- Update the same day's score to breach (55 < 60)
UPDATE driver_daily_safety_scores
SET safety_score = 55
WHERE vehicle_id = :'vehicle_id' AND score_date = CURRENT_DATE;

\echo '--- Expect 1 row: safety score drop breach ---'
SELECT rule_id, vehicle_id, condition_type, breach_value, threshold_value
FROM triggered_alerts
WHERE rule_id = :score_rule_id AND vehicle_id = :'vehicle_id';

-- Update again to the SAME value (55 -> 55): trigger has a no-op guard
-- (TG_OP = 'UPDATE' AND NEW.safety_score = OLD.safety_score), should not
-- create a second alert even though it's still below threshold
UPDATE driver_daily_safety_scores
SET safety_score = 55
WHERE vehicle_id = :'vehicle_id' AND score_date = CURRENT_DATE;

\echo '--- Expect still 1 row: no-op update guard should prevent a duplicate ---'
SELECT COUNT(*) AS total_alerts
FROM triggered_alerts
WHERE rule_id = :score_rule_id AND vehicle_id = :'vehicle_id';

ROLLBACK;
\echo '--- Verification complete, all test data rolled back ---'
\i verify_common_cleanup.sql
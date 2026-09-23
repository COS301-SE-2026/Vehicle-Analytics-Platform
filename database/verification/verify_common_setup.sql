-- Common setup for verification scripts
\set ON_ERROR_STOP on
\set vehicle_id 'VERIFY-VEH-1'

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
VALUES (:'vehicle_id', :group_id)
ON CONFLICT (vehicle_id) DO UPDATE SET fleet_group_id = :group_id;
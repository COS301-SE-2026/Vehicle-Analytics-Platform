DROP INDEX IF EXISTS idx_vehicles_fleet_group;
ALTER TABLE vehicles DROP COLUMN IF EXISTS fleet_group_id;
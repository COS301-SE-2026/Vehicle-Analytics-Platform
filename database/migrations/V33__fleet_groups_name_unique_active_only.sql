ALTER TABLE fleet_groups DROP CONSTRAINT fleet_groups_name_unique;

CREATE UNIQUE INDEX fleet_groups_name_unique_active ON fleet_groups (name) WHERE deleted_at IS NULL;
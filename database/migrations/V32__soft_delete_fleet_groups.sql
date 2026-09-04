ALTER TABLE fleet_groups ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_fleet_groups_deleted_at ON fleet_groups (deleted_at) WHERE deleted_at IS NULL;
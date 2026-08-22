ALTER TABLE vehicles
    ADD COLUMN fleet_group_id BIGINT REFERENCES fleet_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_vehicles_fleet_group ON vehicles (fleet_group_id);
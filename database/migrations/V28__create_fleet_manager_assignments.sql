CREATE TABLE fleet_manager_assignments (
    id                  BIGSERIAL PRIMARY KEY,
    fleet_manager_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fleet_group_id      BIGINT NOT NULL REFERENCES fleet_groups(id) ON DELETE CASCADE,
    assigned_by         INTEGER NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fleet_manager_assignments_unique UNIQUE (fleet_manager_id, fleet_group_id) 
);

CREATE INDEX idx_fma_manager ON fleet_manager_assignments (fleet_manager_id);
CREATE INDEX idx_fma_group ON fleet_manager_assignments (fleet_group_id);
CREATE TABLE fleet_assignment_audit_log (
    id                  BIGSERIAL PRIMARY KEY,
    action              TEXT NOT NULL CHECK (action IN ('ASSIGNED', 'REMOVED')),
    fleet_manager_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    fleet_group_id      BIGINT NOT NULL REFERENCES fleet_groups(id) ON DELETE RESTRICT,
    performed_by        INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    performed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_manager ON fleet_assignment_audit_log (fleet_manager_id);
CREATE INDEX idx_audit_group ON fleet_assignment_audit_log (fleet_group_id);
CREATE INDEX idx_audit_performed_at ON fleet_assignment_audit_log (performed_at);

COMMENT ON TABLE fleet_assignment_audit_log IS
    'Append only logs of fleet to manager assignments or removals. Rows not updated or deleted';
CREATE TABLE IF NOT EXISTS fleet_reports (
    id                  BIGSERIAL PRIMARY KEY,
    scope_type          TEXT        NOT NULL CHECK (scope_type IN ('fleet', 'group', 'vehicle', 'vehicles')),
    scope_id            TEXT,
    scope_label         TEXT        NOT NULL,
    group_ids           BIGINT[]    NOT NULL DEFAULT '{}',
    includes_unassigned BOOLEAN     NOT NULL DEFAULT FALSE,
    period_type         TEXT        NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'current', 'custom')),
    period_start        DATE        NOT NULL,
    period_end          DATE        NOT NULL,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    generated_by        TEXT        NOT NULL,
    trigger_source      TEXT        NOT NULL CHECK (trigger_source IN ('manual', 'scheduled')),
    dataset             JSONB       NOT NULL,
    CONSTRAINT fleet_reports_period_order CHECK (period_end >= period_start)
);

CREATE UNIQUE INDEX IF NOT EXISTS fleet_reports_scheduled_unique
    ON fleet_reports (scope_type, (COALESCE(scope_id, '')), period_type, period_start)
    WHERE trigger_source = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_fleet_reports_generated_at ON fleet_reports (generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fleet_reports_group_ids ON fleet_reports USING GIN (group_ids);
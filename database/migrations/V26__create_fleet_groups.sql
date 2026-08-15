CREATE TABLE fleet_groups (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(), 
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fleet_groups_name_unique UNIQUE (name)
);

CREATE INDEX idx_fleet_groups_name ON fleet_groups (name);
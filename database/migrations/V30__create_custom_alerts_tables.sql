-- Migration V30__create_custom_alerts_table.sql
-- Custom Alerts feature

CREATE TABLE IF NOT EXISTS custom_alert_rules (
    id BIGSERIAL PRIMARY KEY,
    manager_id INT NOT NULL REFERENCES users(id),
    fleet_group_id BIGINT NOT NULL REFRENCES fleet_group(id),
    name TEXT NOT NULL,
    condition_type TEXT NOT NULL CHECK (condition_type IN (
        'speed_threshold',
        'time_based_restriction',
        'repeated_unsafce_events',
        'safety_score_drop',
        'trip_duration_exceeded'
    )),
    condition_params JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    update_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_alert_rules_manager 
    ON custom_alert_rules (manager_id);

CREATE INDEX IF NOT EXISTS idx_custom_alert_rules_fleet_group
    ON custom_alerts_rules (fleet_group_id);

CREATE INDEX IF NOT EXISTS idx_custom_alert_rules_status
    ON custom_alerts_rules (status);

-- Table to store each time a custom alert rule is breached by a vehicle.
CREATE TABLE IF NOT EXISTS triggered_alerts (
    id BIGSERIAL PRIMARY KEY,
    rule_id BIGINT NOT NULL REFERENCES custom_alerts_rules(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL REFERENCES vehicles(vehicle_id),
    fleet_group_id BIGINT NOT NULL REFERENCES fleet_groups(id),
    condition_type TEXT NOT NULL,
    breach_value TEXT,
    threshold_value TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triggered_alerts_rule 
    ON triggered_alerts (rule_id);

CREATE INDEX IF NOT EXISTS idx_triggered_alerts_vehicle
    ON triggered_alerts (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_trigger_alerts_time 
    ON triggered_alerts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_triggered_alerts_rule_vehicle_time
    ON trigger_alerts (rule_id, vehicle_id, created_at DESC);

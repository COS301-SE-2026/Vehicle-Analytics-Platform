-- Migration: V12__create_geofence_tables.sql
-- Geofencing using postgis extension

CREATE TABLE geofences(
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    vehicle_id TEXT REFERENCES vehicles(vehicle_id),
    boundary GEOMETRY(POLYGON, 4326) NOT NULL,
    trigger_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geofences_boundary
ON geofences 
USING GIST (boundary);

CREATE INDEX idx_geofences_vehicle
ON geofences (vehicle_id);



--table to store geofence events triggered by vehicles
CREATE TABLE geofence_events(
    id BIGSERIAL PRIMARY KEY,
    geofence_id BIGINT REFERENCES geofences(id) ON DELETE CASCADE,
    vehicle_id TEXT REFERENCES vehicles(vehicle_id),
    event_type TEXT NOT NULL CHECK (event_type IN ('enter', 'exit')),
    location GEOMETRY(POINT, 4326) NOT NULL,
    speed DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geofence_events_location
ON geofence_events
USING GIST (location);

CREATE INDEX idx_geofence_events_vehicle
ON geofence_events (vehicle_id);

CREATE INDEX idx_geofence_events_time
ON geofence_events (created_at);



--State machine table to track whether a vehicle is inside or outside a geofence
CREATE TABLE geofence_state (
    geofence_id BIGINT REFERENCES geofences(id) ON DELETE CASCADE,
    vehicle_id TEXT REFERENCES vehicles(vehicle_id),
    is_inside BOOLEAN NOT NULL DEFAULT FALSE,
    last_updated TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (geofence_id, vehicle_id)
);

CREATE INDEX idx_geofence_state_vehicle
ON geofence_state(vehicle_id);

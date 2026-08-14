CREATE TABLE geofences(
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    vehicle_id TEXT REFERENCES vehicles(vehicle_id),
    boundary GEOMETRY(POLYGON, 4326) NOT NULL,
    trigger_type TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'user',
    hotspot_kind TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geofences_boundary ON geofences USING GIST (boundary);
CREATE INDEX idx_geofences_vehicle ON geofences (vehicle_id);
CREATE INDEX idx_geofences_source ON geofences (source);
CREATE INDEX idx_geofences_hotspot_kind ON geofences (hotspot_kind) WHERE hotspot_kind IS NOT NULL;

CREATE TABLE geofence_events(
    id BIGSERIAL PRIMARY KEY,
    geofence_id BIGINT REFERENCES geofences(id) ON DELETE CASCADE,
    vehicle_id TEXT REFERENCES vehicles(vehicle_id),
    event_type TEXT NOT NULL
        CHECK (event_type IN ('entry', 'exit', 'hotspot_created', 'security_alert')),
    location GEOMETRY(POINT, 4326) NOT NULL,
    speed DOUBLE PRECISION,
    event_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geofence_events_location ON geofence_events USING GIST (location);
CREATE INDEX idx_geofence_events_vehicle ON geofence_events (vehicle_id);
CREATE INDEX idx_geofence_events_event_time ON geofence_events (event_time DESC);

-- State machine: is a vehicle currently inside a given geofence.
CREATE TABLE geofence_state (
    geofence_id BIGINT REFERENCES geofences(id) ON DELETE CASCADE,
    vehicle_id TEXT REFERENCES vehicles(vehicle_id),
    is_inside BOOLEAN NOT NULL DEFAULT FALSE,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (geofence_id, vehicle_id)
);

CREATE INDEX idx_geofence_state_vehicle ON geofence_state(vehicle_id);

-- Zone boundaries as GeoJSON for the map layer. source and hotspot_kind
-- are exposed so we can style user zones, hotspots and security
-- markers differently.
CREATE OR REPLACE FUNCTION get_geofences_geojson(p_vehicle_id TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE sql STABLE AS $$
    SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
            json_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(g.boundary)::json,
                'properties', json_build_object(
                    'id', g.id,
                    'name', g.name,
                    'trigger_type', g.trigger_type,
                    'vehicle_id', g.vehicle_id,
                    'source', g.source,
                    'hotspot_kind', g.hotspot_kind
                )
            )
        ), '[]'::json)
    )
    FROM geofences g
    WHERE p_vehicle_id IS NULL OR g.vehicle_id = p_vehicle_id OR g.vehicle_id IS NULL;
$$;

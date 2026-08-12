-- Route assignment.

-- The route is a reference geometry

CREATE TABLE routes (
    route_id            BIGSERIAL PRIMARY KEY,
    vehicle_id          TEXT NOT NULL REFERENCES vehicles(vehicle_id),
    route_name          TEXT NOT NULL,

    allowed_deviation_m INTEGER NOT NULL DEFAULT 150,
    geom                GEOMETRY(LINESTRING, 4326) NOT NULL,
    distance_m          DOUBLE PRECISION,
    estimated_time_s    INTEGER,
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One ACTIVE route per vehicle -- not one route per vehicle ever.

CREATE UNIQUE INDEX idx_routes_one_active_per_vehicle
    ON routes (vehicle_id) WHERE active;

-- Deviation checks run per ingestion batch, so this join must be cheap.
CREATE INDEX idx_routes_vehicle_active ON routes (vehicle_id) WHERE active;
CREATE INDEX idx_routes_geom ON routes USING GIST (geom);


CREATE TABLE route_deviation_events (
    event_id            BIGSERIAL PRIMARY KEY,
    route_id            BIGINT NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
    vehicle_id          TEXT NOT NULL REFERENCES vehicles(vehicle_id),
    occurred_at         TIMESTAMPTZ NOT NULL,
    resolved_at         TIMESTAMPTZ,
    max_distance_m      DOUBLE PRECISION,
    distance_from_route DOUBLE PRECISION,
    latitude            NUMERIC,
    longitude           NUMERIC,
    location            GEOMETRY(POINT, 4326) GENERATED ALWAYS AS
                        (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_route_deviation_vehicle_time
    ON route_deviation_events (vehicle_id, occurred_at DESC);
CREATE INDEX idx_route_deviation_route ON route_deviation_events (route_id);
CREATE INDEX idx_route_deviation_location ON route_deviation_events USING GIST (location);

-- Open incidents only -- what the monitoring trigger looks up on every
-- batch, and what the alerts feed queries.
CREATE INDEX idx_route_deviation_open
    ON route_deviation_events (vehicle_id) WHERE resolved_at IS NULL;

-- Current on/off-route state per vehicle.
CREATE TABLE route_state (
    vehicle_id        TEXT PRIMARY KEY REFERENCES vehicles(vehicle_id),
    route_id          BIGINT REFERENCES routes(route_id) ON DELETE CASCADE,
    is_on_route       BOOLEAN NOT NULL DEFAULT TRUE,
    last_distance_m   DOUBLE PRECISION,
    last_checked_time TIMESTAMPTZ,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_route_state_route ON route_state (route_id);

-- Routes as GeoJSON for the map layer, same shape as
-- get_geofences_geojson so the frontend consumes both identically.
CREATE OR REPLACE FUNCTION get_routes_geojson(p_vehicle_id TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE sql STABLE AS $$
    SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
            json_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(r.geom)::json,
                'properties', json_build_object(
                    'route_id', r.route_id,
                    'vehicle_id', r.vehicle_id,
                    'route_name', r.route_name,
                    'allowed_deviation_m', r.allowed_deviation_m,
                    'distance_m', r.distance_m,
                    'estimated_time_s', r.estimated_time_s,
                    'active', r.active
                )
            )
        ), '[]'::json)
    )
    FROM routes r
    WHERE r.active
      AND (p_vehicle_id IS NULL OR r.vehicle_id = p_vehicle_id);
$$;

-- current_vehicle_route: the single read surface for route status.

CREATE OR REPLACE VIEW current_vehicle_route AS
SELECT
    v.vehicle_id,
    r.route_id,
    r.route_name,
    CASE
        WHEN r.route_id IS NULL          THEN 'NO_ROUTE'
        WHEN COALESCE(rs.is_on_route, TRUE) THEN 'ON_ROUTE'
        ELSE 'OFF_ROUTE'
    END                                  AS status,
    COALESCE(rs.is_on_route, TRUE)       AS is_on_route,
    r.allowed_deviation_m                AS allowed_deviation,
    rs.last_distance_m                   AS distance_from_route,
    r.distance_m                         AS route_distance_m,
    r.estimated_time_s,
    rs.last_checked_time,
    -- When the CURRENT deviation started. NULL when on-route.
    open_ev.occurred_at                  AS deviating_since,
    open_ev.max_distance_m               AS deviation_max_distance_m
FROM vehicles v
LEFT JOIN routes r
       ON r.vehicle_id = v.vehicle_id AND r.active
LEFT JOIN route_state rs
       ON rs.vehicle_id = v.vehicle_id
LEFT JOIN LATERAL (
    SELECT e.occurred_at, e.max_distance_m
    FROM route_deviation_events e
    WHERE e.vehicle_id = v.vehicle_id
      AND e.resolved_at IS NULL
    ORDER BY e.occurred_at DESC
    LIMIT 1
) open_ev ON TRUE;
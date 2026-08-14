CREATE TABLE IF NOT EXISTS vehicle_location_cache (
    vehicle_id      TEXT PRIMARY KEY
                    REFERENCES vehicles(vehicle_id),
    latitude        NUMERIC NOT NULL,
    longitude       NUMERIC NOT NULL,
    road            TEXT,
    road_class      TEXT,
    route_number    TEXT,
    speed_limit     INTEGER,
    -- TRUE when speed_limit was inferred from road_class rather than read
    -- from an actual OSM maxspeed tag
    speed_limit_estimated BOOLEAN,
    suburb          TEXT,
    city            TEXT,
    province        TEXT,
    country         TEXT,
    display_name    TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_location_cache_display_name
ON vehicle_location_cache(display_name);
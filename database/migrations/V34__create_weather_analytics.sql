CREATE TABLE IF NOT EXISTS location_geocode_cache (
    id            BIGSERIAL PRIMARY KEY,
    search_term   TEXT NOT NULL UNIQUE,
    display_name  TEXT,               -- for the UI to echo back
    centroid      GEOMETRY(Point, 4326) NOT NULL,
    area_geom     GEOMETRY(Geometry, 4326),
    search_radius_m INTEGER,           -- when area_geom IS NULL
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
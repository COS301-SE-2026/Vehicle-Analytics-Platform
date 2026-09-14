CREATE TABLE IF NOT EXISTS location_geocode_cache (
    id            BIGSERIAL PRIMARY KEY,
    search_term   TEXT NOT NULL UNIQUE,
    display_name  TEXT,               -- for the UI to echo back
    centroid      GEOMETRY(Point, 4326) NOT NULL,
    area_geom     GEOMETRY(Geometry, 4326),
    search_radius_m INTEGER,           -- when area_geom IS NULL
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_geocode_cache_area
    ON location_geocode_cache USING GIST (area_geom);
 
-- Daily weather per geocoded location, from Open-Meteo's
CREATE TABLE IF NOT EXISTS weather_observations (
    lat_grid       NUMERIC(6,3) NOT NULL,   -- ~100m
    lon_grid       NUMERIC(6,3) NOT NULL,
    obs_date       DATE NOT NULL,
    precipitation_mm NUMERIC,
    temp_max_c     NUMERIC,
    temp_min_c     NUMERIC,
    weather_bucket TEXT NOT NULL,
    fetched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (lat_grid, lon_grid, obs_date)
);
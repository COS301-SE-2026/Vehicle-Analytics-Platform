-- OSM fixture tables.
-- Geography is around Madadeni / Newcastle

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- roads
CREATE TABLE IF NOT EXISTS roads (
    id            BIGSERIAL PRIMARY KEY,
    road_name     TEXT,
    road_class    TEXT,
    route_number  TEXT,
    maxspeed      TEXT,
    maxspeed_kmh  INTEGER,
    geom          GEOMETRY(LineString, 4326)
);
CREATE INDEX IF NOT EXISTS idx_roads_geom ON roads USING GIST (geom);

CREATE TABLE IF NOT EXISTS places (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT,
    place_type  TEXT,
    population  INTEGER,
    geom        GEOMETRY(Geometry, 4326)
);
CREATE INDEX IF NOT EXISTS idx_places_geom ON places USING GIST (geom);

CREATE TABLE IF NOT EXISTS admin_boundaries (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT,
    admin_level INTEGER,
    geom        GEOMETRY(MultiPolygon, 4326)
);
CREATE INDEX IF NOT EXISTS idx_admin_boundaries_geom ON admin_boundaries USING GIST (geom);

TRUNCATE roads, places, admin_boundaries RESTART IDENTITY;

INSERT INTO roads (road_name, road_class, route_number, maxspeed, maxspeed_kmh, geom) VALUES
('Allen Street', 'residential', NULL, '60', 60,
 ST_SetSRID(ST_MakeLine(ST_MakePoint(30.0500, -27.7640), ST_MakePoint(30.0560, -27.7640)), 4326)),

('Newcastle Road', 'primary', 'R34', NULL, NULL,
 ST_SetSRID(ST_MakeLine(ST_MakePoint(30.0500, -27.7700), ST_MakePoint(30.0600, -27.7700)), 4326)),

(NULL, 'unclassified', NULL, NULL, NULL,
 ST_SetSRID(ST_MakeLine(ST_MakePoint(30.0500, -27.7800), ST_MakePoint(30.0560, -27.7800)), 4326)),

('Depot Access', 'service', NULL, NULL, NULL,
 ST_SetSRID(ST_MakeLine(ST_MakePoint(30.0520, -27.7660), ST_MakePoint(30.0530, -27.7665)), 4326)),

('N11', 'motorway', 'N11', '120', 120,
 ST_SetSRID(ST_MakeLine(ST_MakePoint(29.9800, -27.8000), ST_MakePoint(30.0200, -27.8200)), 4326));

INSERT INTO places (name, place_type, population, geom) VALUES
('Madadeni', 'suburb', 120000,
 ST_SetSRID(ST_MakeEnvelope(30.040, -27.790, 30.070, -27.755, 4326), 4326)),

('Newcastle', 'city', 380000,
 ST_SetSRID(ST_MakePoint(29.9310, -27.7580), 4326)),
('Distant Town', 'town', 5000,
 ST_SetSRID(ST_MakePoint(28.0000, -26.0000), 4326));

INSERT INTO admin_boundaries (name, admin_level, geom) VALUES
('KwaZulu-Natal', 4,
 ST_Multi(ST_SetSRID(ST_MakeEnvelope(29.0, -28.5, 31.0, -27.0, 4326), 4326))),
('South Africa', 2,
 ST_Multi(ST_SetSRID(ST_MakeEnvelope(16.0, -35.0, 33.0, -22.0, 4326), 4326)));

ANALYZE roads;
ANALYZE places;
ANALYZE admin_boundaries;
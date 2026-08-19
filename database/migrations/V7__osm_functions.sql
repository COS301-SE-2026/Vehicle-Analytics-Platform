--Reusable PostGIS helpers for:
-- Nearest road lookup (with speed-limit estimation)
-- Place lookup
-- Administrative boundary lookup
-- Reverse geocoding


-- SPEED LIMIT ESTIMATION
CREATE OR REPLACE FUNCTION estimated_speed_limit(p_road_class TEXT)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE p_road_class
        WHEN 'motorway'       THEN 120
        WHEN 'motorway_link'  THEN 80
        WHEN 'trunk'          THEN 100
        WHEN 'trunk_link'     THEN 60
        WHEN 'primary'        THEN 100
        WHEN 'primary_link'   THEN 60
        WHEN 'secondary'      THEN 80
        WHEN 'secondary_link' THEN 60
        WHEN 'tertiary'       THEN 80
        WHEN 'tertiary_link'  THEN 60
        WHEN 'unclassified'   THEN 60
        WHEN 'residential'    THEN 60
        WHEN 'living_street'  THEN 20
        WHEN 'service'        THEN 20   -- driveways, parking aisles, yards
        WHEN 'road'           THEN 60   -- OSM's "class unknown"
        ELSE NULL                       -- unrecognised class: no guess at all
    END;
$$;

-- NEAREST ROAD
DROP TYPE IF EXISTS road_details CASCADE;

CREATE TYPE road_details AS (
    road_name              TEXT,
    road_class             TEXT,
    route_number           TEXT,
    speed_limit            INTEGER,
    speed_limit_estimated  BOOLEAN,
    distance_m             DOUBLE PRECISION
);

CREATE OR REPLACE FUNCTION get_nearest_road(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION
)
RETURNS road_details
LANGUAGE sql
STABLE
AS
$$
SELECT
(
    COALESCE(NULLIF(r.road_name, ''), 'Unnamed Road'),
    r.road_class,
    r.route_number,
    COALESCE(r.maxspeed_kmh, estimated_speed_limit(r.road_class)),
    -- TRUE when the number above came from road_class rather than an
    -- actual OSM maxspeed tag.
    (r.maxspeed_kmh IS NULL AND estimated_speed_limit(r.road_class) IS NOT NULL),
    ST_Distance(
        r.geom::geography,
        ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
    )
)::road_details
FROM roads r
-- 2km ceiling
WHERE r.geom && ST_Expand(ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326), 0.02)
  AND ST_DWithin(
        r.geom::geography,
        ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
        2000
      )
ORDER BY
    r.geom <-> ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326),
    CASE WHEN r.road_name IS NULL THEN 1 ELSE 0 END
LIMIT 1;
$$;

-- PLACE LOOKUP
DROP TYPE IF EXISTS place_details CASCADE;

CREATE TYPE place_details AS (
    suburb TEXT,
    city TEXT
);

CREATE OR REPLACE FUNCTION get_place (
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION
)
RETURNS place_details
LANGUAGE sql
STABLE
AS
$$

WITH point AS (
    SELECT ST_SetSRID(
        ST_MakePoint(p_lon, p_lat),
        4326
    ) AS geom
),

polygon_match AS (
    SELECT
        p.name,
        p.place_type,
        p.population
    FROM places p
    CROSS JOIN point pt
    WHERE GeometryType(p.geom) IN ('POLYGON', 'MULTIPOLYGON')
      AND ST_Contains(p.geom, pt.geom)
),

nearest_points AS (
    SELECT
        p.name,
        p.place_type,
        p.population,
        ST_Distance(
            p.geom::geography,
            pt.geom::geography
        ) AS distance_m
    FROM places p
    CROSS JOIN point pt
    WHERE GeometryType(p.geom) = 'POINT'
)

SELECT (
    COALESCE(

        (
            SELECT name
            FROM polygon_match
            WHERE place_type IN (
                'suburb',
                'neighbourhood',
                'quarter'
            )
            ORDER BY population DESC NULLS LAST
            LIMIT 1
        ),

        (
            SELECT name
            FROM nearest_points
            WHERE place_type IN (
                'suburb',
                'neighbourhood',
                'quarter'
            )
              AND distance_m <= 2000
            ORDER BY distance_m
            LIMIT 1
        )

    ),

    COALESCE(

        (
            SELECT name
            FROM polygon_match
            WHERE place_type IN (
                'city',
                'town',
                'municipality',
                'village'
            )
            ORDER BY population DESC NULLS LAST
            LIMIT 1
        ),

        (
            SELECT name
            FROM nearest_points
            WHERE place_type IN (
                'city',
                'town',
                'municipality',
                'village'
            )
              AND distance_m <= 20000
            ORDER BY distance_m
            LIMIT 1
        )

    )

)::place_details;

$$;

-- ADMIN BOUNDARY LOOKUP
CREATE OR REPLACE FUNCTION get_admin_name(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_level INTEGER
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS
$$

SELECT name
FROM admin_boundaries
WHERE
    admin_level = p_level
AND ST_Contains(
    geom,
    ST_SetSRID(
        ST_MakePoint(p_lon, p_lat),
        4326
    )
)
LIMIT 1;

$$;

-- FULL LOCATION LOOKUP
DROP TYPE IF EXISTS location_details CASCADE;

CREATE TYPE location_details AS (
    road                   TEXT,
    road_class             TEXT,
    route_number           TEXT,
    speed_limit            INTEGER,
    speed_limit_estimated  BOOLEAN,
    suburb                 TEXT,
    city                   TEXT,
    province               TEXT,
    country                TEXT,
    display_name           TEXT
);

CREATE OR REPLACE FUNCTION get_location_details(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION
)
RETURNS location_details
LANGUAGE sql
STABLE
AS
$$
WITH
road     AS (SELECT * FROM get_nearest_road(p_lat, p_lon)),
place    AS (SELECT * FROM get_place(p_lat, p_lon)),
province AS (SELECT get_admin_name(p_lat, p_lon, 4) AS name),
country  AS (SELECT get_admin_name(p_lat, p_lon, 2) AS name)
SELECT
(
    road.road_name,
    road.road_class,
    road.route_number,
    road.speed_limit,
    road.speed_limit_estimated,
    place.suburb,
    place.city,
    province.name,
    country.name,
    CONCAT_WS(', ',
        NULLIF(road.road_name, ''),
        NULLIF(place.suburb, ''),
        NULLIF(place.city, ''),
        NULLIF(province.name, ''),
        NULLIF(country.name, '')
    )
)::location_details
FROM road
CROSS JOIN place
CROSS JOIN province
CROSS JOIN country;
$$;

-- Run once to cluster the static OSM tables
CLUSTER roads USING roads_geom_idx;
ANALYZE roads;

CLUSTER places USING places_geom_idx;
ANALYZE places;

CLUSTER admin_boundaries USING admin_boundaries_geom_idx;
ANALYZE admin_boundaries;

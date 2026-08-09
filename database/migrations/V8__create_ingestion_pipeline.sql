CREATE OR REPLACE FUNCTION safe_numeric(val TEXT) RETURNS NUMERIC AS $$
    SELECT CASE WHEN val ~ '^-?[0-9]+(\.[0-9]+)?$' THEN val::NUMERIC ELSE NULL END;
$$ LANGUAGE sql IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION safe_int(val TEXT) RETURNS INTEGER AS $$
    SELECT CASE WHEN val ~ '^-?[0-9]+$' THEN val::INTEGER ELSE NULL END;
$$ LANGUAGE sql IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION safe_bigint(val TEXT) RETURNS BIGINT AS $$
    SELECT CASE WHEN val ~ '^-?[0-9]+$' THEN val::BIGINT ELSE NULL END;
$$ LANGUAGE sql IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION safe_lat(lat_lng TEXT) RETURNS NUMERIC AS $$
    SELECT CASE WHEN lat_lng IS NOT NULL AND position(',' in lat_lng) > 0
                THEN safe_numeric(split_part(lat_lng, ',', 1)) END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION safe_lng(lat_lng TEXT) RETURNS NUMERIC AS $$
    SELECT CASE WHEN lat_lng IS NOT NULL AND position(',' in lat_lng) > 0
                THEN safe_numeric(split_part(lat_lng, ',', 2)) END;
$$ LANGUAGE sql IMMUTABLE;


CREATE TABLE IF NOT EXISTS current_vehicle_position (
    vehicle_id      TEXT PRIMARY KEY REFERENCES vehicles(vehicle_id),
    device_id       TEXT,
    latitude        NUMERIC,
    longitude       NUMERIC,
    location        GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    last_update     TIMESTAMPTZ,
    speed           INTEGER,
    total_odometer  BIGINT,
    ignition        TEXT,
    movement        TEXT
);

-- Powers map-viewport bbox filtering (get_fleet_positions_geojson)
CREATE INDEX IF NOT EXISTS idx_current_vehicle_position_location
    ON current_vehicle_position USING GIST (location);

-- index on the geography cast: a geometry GIST index does NOT accelerate
-- geography predicates (ST_DWithin in metres) -- both are needed.
CREATE INDEX IF NOT EXISTS idx_current_vehicle_position_geog
    ON current_vehicle_position USING GIST ((location::geography));

-- Geocoding throttle.
CREATE OR REPLACE FUNCTION geocode_refresh_interval()
RETURNS INTERVAL LANGUAGE sql IMMUTABLE AS $$ SELECT INTERVAL '60 seconds'; $$;

CREATE OR REPLACE FUNCTION geocode_refresh_distance_m()
RETURNS DOUBLE PRECISION LANGUAGE sql IMMUTABLE AS $$ SELECT 500; $$;

-- Batch trigger function
CREATE OR REPLACE FUNCTION parse_and_insert_telemetry_batch()
RETURNS TRIGGER AS $$
BEGIN
    -- 0. Register any vehicles seen for the first time.
    INSERT INTO vehicles (vehicle_id, device_id)
    SELECT DISTINCT ON (nr.vehicle_id) nr.vehicle_id, nr.device_id
    FROM new_rows nr
    ON CONFLICT (vehicle_id) DO NOTHING;

    -- 1. Log rows with fields that failed to parse.
    INSERT INTO telemetry_errors (vehicle_id, error_message, raw_payload)
    SELECT nr.vehicle_id,
           'Unparseable numeric field(s) in raw_telemetry row',
           row_to_json(nr)::text
    FROM new_rows nr
    WHERE (nr.lat_lng IS NOT NULL AND nr.lat_lng <> ''
           AND (position(',' in nr.lat_lng) = 0
                OR safe_lat(nr.lat_lng) IS NULL
                OR safe_lng(nr.lat_lng) IS NULL))
       OR (nr.spd IS NOT NULL AND nr.spd <> '' AND safe_int(nr.spd) IS NULL)
       OR (nr.total_odometer IS NOT NULL AND nr.total_odometer <> ''
           AND safe_bigint(nr.total_odometer) IS NULL);

    -- 2. Bulk breadcrumb insert -- every row, parsed.
    INSERT INTO clean_telemetry (
        time, vehicle_id, device_id, measurement,
        latitude, longitude, speed, total_odometer, ignition, movement
    )
    SELECT nr.time, nr.vehicle_id, nr.device_id, nr.measurement,
           safe_lat(nr.lat_lng), safe_lng(nr.lat_lng),
           safe_int(nr.spd), safe_bigint(nr.total_odometer),
           nr.ignition, nr.movement
    FROM new_rows nr
    ON CONFLICT (time, vehicle_id, measurement) DO NOTHING;

    -- 3. Bulk safety-event insert.
    INSERT INTO vehicle_events (
        time, vehicle_id, device_id, event_category, event_detail,
        latitude, longitude, speed, total_odometer, ignition, movement
    )
    SELECT nr.time, nr.vehicle_id, nr.device_id, nr.event,
           CASE nr.event
               WHEN 'green_driving_type' THEN nr.green_driving_type
               WHEN 'crash_detection'    THEN nr.crash_detection
               WHEN 'ignition'           THEN nr.ignition
               ELSE NULL
           END,
           safe_lat(nr.lat_lng), safe_lng(nr.lat_lng),
           safe_int(nr.spd), safe_bigint(nr.total_odometer),
           nr.ignition, nr.movement
    FROM new_rows nr
    WHERE nr.measurement = 'avl_event'
    ON CONFLICT (time, vehicle_id, event_category) DO NOTHING;


    INSERT INTO current_vehicle_position (
        vehicle_id, device_id, latitude, longitude, last_update,
        speed, total_odometer, ignition, movement
    )
    SELECT DISTINCT ON (nr.vehicle_id)
           nr.vehicle_id, nr.device_id, safe_lat(nr.lat_lng), safe_lng(nr.lat_lng), nr.time,
           safe_int(nr.spd), safe_bigint(nr.total_odometer), nr.ignition, nr.movement
    FROM new_rows nr
    ORDER BY nr.vehicle_id, nr.time DESC
    ON CONFLICT (vehicle_id) DO UPDATE SET
        device_id      = EXCLUDED.device_id,
        latitude       = EXCLUDED.latitude,
        longitude      = EXCLUDED.longitude,
        last_update    = EXCLUDED.last_update,
        speed          = EXCLUDED.speed,
        total_odometer = EXCLUDED.total_odometer,
        ignition       = EXCLUDED.ignition,
        movement       = EXCLUDED.movement
    WHERE EXCLUDED.last_update > current_vehicle_position.last_update
       OR current_vehicle_position.last_update IS NULL;


    WITH candidates AS MATERIALIZED (
        SELECT cvp.vehicle_id, cvp.latitude, cvp.longitude
        FROM current_vehicle_position cvp
        JOIN (SELECT DISTINCT vehicle_id FROM new_rows) nr
          ON nr.vehicle_id = cvp.vehicle_id
        LEFT JOIN vehicle_location_cache vlc
          ON vlc.vehicle_id = cvp.vehicle_id
        WHERE cvp.latitude IS NOT NULL
          AND cvp.longitude IS NOT NULL
          AND (
                vlc.vehicle_id IS NULL                                    -- never geocoded
             OR vlc.updated_at < NOW() - geocode_refresh_interval()       -- stale
             OR ST_Distance(                                              -- moved far enough
                  ST_SetSRID(ST_MakePoint(cvp.longitude, cvp.latitude), 4326)::geography,
                  ST_SetSRID(ST_MakePoint(vlc.longitude, vlc.latitude), 4326)::geography
                ) > geocode_refresh_distance_m()
          )
    )
    INSERT INTO vehicle_location_cache (
        vehicle_id, latitude, longitude,
        road, road_class, route_number, speed_limit, speed_limit_estimated,
        suburb, city, province, country, display_name, updated_at
    )
    SELECT c.vehicle_id, c.latitude, c.longitude,
           loc.road, loc.road_class, loc.route_number,
           loc.speed_limit, loc.speed_limit_estimated,
           loc.suburb, loc.city, loc.province, loc.country, loc.display_name,
           NOW()
    FROM candidates c
    CROSS JOIN LATERAL get_location_details(c.latitude, c.longitude) AS loc
    ON CONFLICT (vehicle_id) DO UPDATE SET
        latitude     = EXCLUDED.latitude,
        longitude    = EXCLUDED.longitude,
        road         = EXCLUDED.road,
        road_class   = EXCLUDED.road_class,
        route_number = EXCLUDED.route_number,
        speed_limit  = EXCLUDED.speed_limit,
        speed_limit_estimated = EXCLUDED.speed_limit_estimated,
        suburb       = EXCLUDED.suburb,
        city         = EXCLUDED.city,
        province     = EXCLUDED.province,
        country      = EXCLUDED.country,
        display_name = EXCLUDED.display_name,
        updated_at   = NOW();

    RETURN NULL;

EXCEPTION WHEN OTHERS THEN
    INSERT INTO telemetry_errors (vehicle_id, error_message, raw_payload)
    VALUES (NULL, 'Batch ingestion failure: ' || SQLERRM, NULL);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_parse_raw_telemetry
AFTER INSERT ON raw_telemetry
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION parse_and_insert_telemetry_batch();

CREATE OR REPLACE FUNCTION get_vehicle_status(
    p_last_update TIMESTAMPTZ,
    p_movement TEXT,
    p_speed INTEGER
)
RETURNS TEXT
LANGUAGE sql STABLE AS $$
    SELECT CASE
        WHEN p_last_update IS NULL THEN 'offline'
        WHEN p_last_update < (NOW() AT TIME ZONE 'UTC' - INTERVAL '5 minutes') THEN 'offline'
        WHEN COALESCE(p_movement, 'Movement Off') = 'Movement Off'
             AND COALESCE(p_speed, 0) < 5 THEN 'idle'
        ELSE 'active'
    END;
$$;
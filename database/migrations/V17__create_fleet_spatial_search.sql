-- "Which vehicle is closest to this point" 

CREATE OR REPLACE FUNCTION get_vehicles_near(
    p_lng DOUBLE PRECISION,
    p_lat DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 5
)
RETURNS TABLE (
    vehicle_id TEXT,
    distance_km DOUBLE PRECISION,
    latitude NUMERIC,
    longitude NUMERIC,
    last_update TIMESTAMPTZ,
    speed INTEGER
)
LANGUAGE sql STABLE AS $$
    SELECT
        cvp.vehicle_id,
        ST_Distance(cvp.location::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) / 1000.0,
        cvp.latitude, cvp.longitude, cvp.last_update, cvp.speed
    FROM current_vehicle_position cvp
    WHERE ST_DWithin(
        cvp.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_km * 1000
    )
    ORDER BY cvp.location::geography <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
$$;

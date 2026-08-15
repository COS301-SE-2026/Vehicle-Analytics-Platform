
CREATE OR REPLACE FUNCTION cluster_points(
    p_vehicle_id TEXT default NULL,
    p_days INTEGER default 7,
    p_radius_km DOUBLE PRECISION default 0.5,
    p_min_points INTEGER default 3
)
RETURNS TABLE(
    vehicle_id TEXT,
    cluster_id INTEGER,
    point_count BIGINT,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    centroid_lat DOUBLE PRECISION,
    centroid_lng DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
DECLARE
    p_eps_meters DOUBLE PRECISION := p_radius_km * 1000;
BEGIN
    RETURN QUERY
    WITH filtered_telemetry AS (
        SELECT
            t.vehicle_id,
            t.time,
            ST_TRANSFORM(t.location, 3857) AS geom_proj,
            t.location AS geom_4326
        FROM clean_telemetry t
        WHERE (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id)
          AND t.time >= NOW() - (p_days || ' days')::INTERVAL
          AND t.location IS NOT NULL
          AND t.speed < 5
          AND lower(t.movement) = 'off'
          AND lower(t.ignition) = 'off'
    ),
    clustered AS (
        SELECT
            f.vehicle_id,
            f.time,
            f.geom_4326,
            ST_ClusterDBSCAN(f.geom_proj, eps := p_eps_meters, minpoints := p_min_points)
             OVER (PARTITION BY f.vehicle_id) AS cluster_id
        FROM filtered_telemetry f
    )
    SELECT
        c.vehicle_id,
        c.cluster_id::INTEGER,
        COUNT(*) AS point_count,
        MIN(c.time) AS first_seen,
        MAX(c.time) AS last_seen,
        ST_Y(ST_Centroid(ST_Collect(c.geom_4326))) AS centroid_lat,
        ST_X(ST_Centroid(ST_Collect(c.geom_4326))) AS centroid_lng
    FROM clustered c
    WHERE c.cluster_id IS NOT NULL
    GROUP BY c.vehicle_id, c.cluster_id
    ORDER BY point_count DESC;
END;
$$;


-- Turns a cluster centroid into an actual geofence boundary
CREATE OR REPLACE FUNCTION make_circular_geofence_boundary(
    p_center_lng DOUBLE PRECISION,
    p_center_lat DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION
)
RETURNS GEOMETRY(POLYGON, 4326)
LANGUAGE sql IMMUTABLE AS $$
    SELECT ST_Buffer(
        ST_SetSRID(ST_MakePoint(p_center_lng, p_center_lat), 4326)::geography,
        p_radius_km * 1000
    )::geometry;
$$;

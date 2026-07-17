-- Migration V14: Create cluster_points function
--Find frequent stops for a vehicle using DBSCAN clustering algorithm

CREATE OR REPLACE FUNCTION cluster_points(
    p_vehicle_id TEXT default NULL,
    p_days INTEGER default 7, --since data loops after 7 days, we can use this as default
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
    p_eps_meters DOUBLE PRECISION := p_radius_km * 1000; -- Convert km to meters
BEGIN
    RETURN QUERY
    WITH filtered_telemetry AS (
        SELECT 
            t.vehicle_id,
            t.time,
            --geometry in meters for DBSCAN distance calculation
            ST_TRANSFORM(ST_SetSRID(ST_MakePoint(t.longitude, t.latitude), 4326), 3857) AS geom_proj,
            --original WGS84 for gps coordinates
            ST_SetSRID(ST_MakePoint(t.longitude, t.latitude), 4326) AS geom_4326

        FROM clean_telemetry t
        WHERE (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id)
          AND t.time >= NOW() - (p_days  || ' days')::INTERVAL
          AND t.latitude IS NOT NULL AND t.longitude IS NOT NULL
          AND t.speed < 5 -- Only consider points where speed is less than 5 m/s
          AND LOWER(COALESCE(t.movement, '')) = 'off'
          AND LOWER(COALESCE(t.ignition, '')) = 'off'
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
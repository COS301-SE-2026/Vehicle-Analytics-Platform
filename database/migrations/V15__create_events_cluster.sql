-- Discover hotspots of avl events (harsh braking, crashes, etc).

CREATE INDEX IF NOT EXISTS idx_vehicle_events_lookup
  ON vehicle_events (event_category, event_detail, time);

CREATE OR REPLACE FUNCTION cluster_events(
    p_event_category TEXT default NULL,
    p_event_detail TEXT default NULL,
    p_vehicle_id TEXT default NULL,
    p_days INTEGER default 30,
    radius_km DOUBLE PRECISION default 0.25,
    min_points INTEGER default 10
)
RETURNS TABLE(
    cluster_id INTEGER,
    event_category TEXT,
    event_detail TEXT,
    event_count INTEGER,
    vehicle_count INTEGER,
    centroid_lat DOUBLE PRECISION,
    centroid_lng DOUBLE PRECISION,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    eps_meters DOUBLE PRECISION := radius_km * 1000;
BEGIN
    RETURN QUERY
    WITH filtered_events AS (
        SELECT
            e.vehicle_id,
            e.event_category,
            e.event_detail,
            e.time,
            ST_TRANSFORM(e.location, 3857) AS geom_proj,
            e.location AS geom_4326
        FROM vehicle_events e
        WHERE e.location IS NOT NULL
          AND e.time >= NOW() - (p_days || ' days')::INTERVAL
          AND (p_vehicle_id IS NULL OR e.vehicle_id = p_vehicle_id)
          AND (p_event_category IS NOT NULL OR e.event_category <> 'ignition')
          AND (p_event_category IS NULL OR e.event_category = p_event_category)
          AND (p_event_detail IS NULL OR e.event_detail = p_event_detail)
    ),
    clustered AS (
        SELECT
            f.vehicle_id,
            f.time,
            f.event_category,
            f.event_detail,
            f.geom_4326,
            ST_ClusterDBSCAN(f.geom_proj, eps := eps_meters, minpoints := min_points)
             OVER (PARTITION BY f.event_category, f.event_detail) AS cluster_id
        FROM filtered_events f
    )
    SELECT
        c.cluster_id::INTEGER,
        c.event_category,
        c.event_detail,
        COUNT(*)::INTEGER AS event_count,
        COUNT(DISTINCT c.vehicle_id)::INTEGER AS vehicle_count,
        ST_Y(ST_Centroid(ST_Collect(c.geom_4326))) AS centroid_lat,
        ST_X(ST_Centroid(ST_Collect(c.geom_4326))) AS centroid_lng,
        MIN(c.time) AS first_seen,
        MAX(c.time) AS last_seen
    FROM clustered c
    WHERE c.cluster_id IS NOT NULL
    GROUP BY c.cluster_id, c.event_category, c.event_detail
    ORDER BY event_count DESC, vehicle_count DESC;
END;
$$;

-- Single source of truth for real calibrated crash detection
CREATE OR REPLACE FUNCTION is_real_crash(p_category TEXT, p_detail TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT p_category = 'crash_detection'
       AND p_detail = 'real crash detected (device is calibrated)';
$$;

-- Single source of truth for which events count toward a hotspot
CREATE OR REPLACE FUNCTION is_hotspot_event(p_category TEXT, p_detail TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT (p_category = 'green_driving_type'
            AND p_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering'))
        OR  p_category = 'over_speeding'
        OR  is_real_crash(p_category, p_detail);
$$;

CREATE OR REPLACE FUNCTION evaluate_event_hotspot(
    p_point         GEOMETRY(POINT, 4326),
    p_radius_km     DOUBLE PRECISION DEFAULT 0.25,
    p_min_incidents INTEGER          DEFAULT 100,
    p_window        INTERVAL         DEFAULT INTERVAL '7 days'
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_radius_m    DOUBLE PRECISION := p_radius_km * 1000;
    v_deg_delta   DOUBLE PRECISION := p_radius_km * 0.009; -- ~0.009°/km bbox prefilter
    v_incidents   INTEGER;
    v_events      INTEGER;
    v_vehicles    INTEGER;
    v_days        INTEGER;
    v_avg_speed   NUMERIC;
    v_centroid    GEOMETRY(POINT, 4326);
    v_last_time   TIMESTAMPTZ;
    v_area        TEXT;
    v_type_key    TEXT;
    v_top_vehicle TEXT;
    v_owner       TEXT;
    v_label       TEXT;
    v_name        TEXT;
    v_id          BIGINT;
BEGIN
    IF p_point IS NULL THEN
        RETURN NULL;
    END IF;

    -- Skip if the point already falls inside an auto hotspot
    IF EXISTS (
        SELECT 1 FROM geofences g
        WHERE g.source = 'auto_hotspot'
          AND g.boundary && p_point
          AND ST_Contains(g.boundary, p_point)
    ) THEN
        RETURN NULL;
    END IF;

    -- Aggregate metrics
    WITH matching_events AS (
        SELECT e.vehicle_id, e.time, e.speed, e.location,
               CASE
                 WHEN LAG(e.time) OVER w IS NULL
                   OR e.time - LAG(e.time) OVER w > incident_burst_window()
                 THEN 1 ELSE 0
               END AS starts_incident
        FROM vehicle_events e
        WHERE e.location IS NOT NULL
          AND e.location && ST_Expand(p_point, v_deg_delta)
          AND e.time >= NOW() - p_window
          AND ST_DWithin(e.location::geography, p_point::geography, v_radius_m)
          AND is_hotspot_event(e.event_category, e.event_detail)
        WINDOW w AS (PARTITION BY e.vehicle_id ORDER BY e.time)
    )
    SELECT SUM(starts_incident), COUNT(*), COUNT(DISTINCT vehicle_id),
           COUNT(DISTINCT time::date), ROUND(AVG(speed)),
           ST_Centroid(ST_Collect(location)), MAX(time)
    INTO v_incidents, v_events, v_vehicles, v_days, v_avg_speed, v_centroid, v_last_time
    FROM matching_events;

    IF v_incidents IS NULL OR v_incidents < p_min_incidents THEN
        RETURN NULL;
    END IF;

    -- Dominant event type and top contributing vehicle, both by incident count
    WITH matching_events AS (
        SELECT e.vehicle_id, e.time,
               CASE WHEN e.event_category = 'green_driving_type'
                    THEN e.event_detail ELSE e.event_category
               END AS event_type_key,
               CASE
                 WHEN LAG(e.time) OVER w IS NULL
                   OR e.time - LAG(e.time) OVER w > incident_burst_window()
                 THEN 1 ELSE 0
               END AS starts_incident
        FROM vehicle_events e
        WHERE e.location IS NOT NULL
          AND e.location && ST_Expand(p_point, v_deg_delta)
          AND e.time >= NOW() - p_window
          AND ST_DWithin(e.location::geography, p_point::geography, v_radius_m)
          AND is_hotspot_event(e.event_category, e.event_detail)
        WINDOW w AS (PARTITION BY e.vehicle_id ORDER BY e.time)
    ),
    numbered AS (
        SELECT vehicle_id, event_type_key, time,
               SUM(starts_incident) OVER (PARTITION BY vehicle_id ORDER BY time) AS incident_no
        FROM matching_events
    ),
    incident_list AS (
        SELECT vehicle_id, (array_agg(event_type_key ORDER BY time))[1] AS type_key
        FROM numbered
        GROUP BY vehicle_id, incident_no
    )
    SELECT
        (SELECT type_key   FROM incident_list GROUP BY type_key
         ORDER BY COUNT(*) DESC, type_key LIMIT 1),
        (SELECT vehicle_id FROM incident_list GROUP BY vehicle_id
         ORDER BY COUNT(*) DESC, vehicle_id LIMIT 1)
    INTO v_type_key, v_top_vehicle;

    -- Attribute the zone only when one vehicle produced all of it
    v_owner := CASE WHEN v_vehicles = 1 THEN v_top_vehicle END;

    v_label := CASE v_type_key
        WHEN 'harsh_braking'      THEN 'Harsh braking'
        WHEN 'harsh_acceleration' THEN 'Harsh acceleration'
        WHEN 'harsh_cornering'    THEN 'Harsh cornering'
        WHEN 'over_speeding'      THEN 'Overspeeding'
        WHEN 'crash_detection'   THEN 'Crash detection'
        ELSE 'Hotspot'
    END;

    v_area := describe_point_area(ST_Y(v_centroid), ST_X(v_centroid));

    v_name := LEFT(
        COALESCE(NULLIF(v_area, '') || ' - ', '')
        || v_label
        || ' (' || v_incidents || ' instances, '
        || CASE WHEN v_vehicles = 1
                THEN 'vehicle ' || v_top_vehicle
                ELSE v_vehicles || ' vehicles, mostly ' || v_top_vehicle
           END
        || ', ~avg speed ' || COALESCE(v_avg_speed, 0) || ' km/h)',
        255
    );

    INSERT INTO geofences (name, vehicle_id, boundary, trigger_type, source, hotspot_kind)
    VALUES (
        v_name, v_owner,
        make_circular_geofence_boundary(ST_X(v_centroid), ST_Y(v_centroid), p_radius_km),
        'none', 'auto_hotspot', v_type_key
    )
    RETURNING id INTO v_id;

    INSERT INTO geofence_events (geofence_id, vehicle_id, event_type, location, speed, event_time)
    VALUES (v_id, v_owner, 'hotspot_created', v_centroid, v_avg_speed, v_last_time);

    RETURN v_id;
END;
$$;
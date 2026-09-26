CREATE OR REPLACE FUNCTION incident_burst_window()
RETURNS INTERVAL
LANGUAGE sql
IMMUTABLE
AS $$ SELECT INTERVAL '60 seconds'; $$;

CREATE OR REPLACE FUNCTION describe_point_area(p_lat DOUBLE PRECISION, p_lon DOUBLE PRECISION)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_loc  location_details;
    v_road TEXT;
BEGIN
    SELECT * INTO v_loc FROM get_location_details(p_lat, p_lon);
    v_road := NULLIF(v_loc.road, '');

    IF v_road IS NULL OR v_road = 'Unnamed Road' THEN
        RETURN COALESCE(NULLIF(v_loc.suburb, ''), NULLIF(v_loc.city, ''), 'Unnamed area');
    END IF;

    RETURN v_road;
EXCEPTION WHEN OTHERS THEN
    -- Geocoding failure downgrades the label
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION evaluate_event_hotspot(
    p_point         GEOMETRY(POINT, 4326),
    p_radius_km     DOUBLE PRECISION DEFAULT 0.25,
    p_min_incidents INTEGER          DEFAULT 100,
    p_window        INTERVAL         DEFAULT INTERVAL '14 days'
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_radius_m   DOUBLE PRECISION := p_radius_km * 1000;
    v_deg_delta  DOUBLE PRECISION := p_radius_km * 0.009; -- ~0.009°/km for R-Tree spatial index filter
    v_incidents  INTEGER;
    v_events     INTEGER;
    v_vehicles   INTEGER;
    v_days       INTEGER;
    v_avg_speed  NUMERIC;
    v_centroid   GEOMETRY(POINT, 4326);
    v_last_time  TIMESTAMPTZ;
    v_area       TEXT;
    v_type_key   TEXT;
    v_label      TEXT;
    v_name       TEXT;
    v_id         BIGINT;
BEGIN
    IF p_point IS NULL THEN
        RETURN NULL;
    END IF;

    -- Fast spatial index check: skip if point already falls inside an auto hotspot
    IF EXISTS (
        SELECT 1 FROM geofences g
        WHERE g.source = 'auto_hotspot'
          AND g.boundary && p_point
          AND ST_Contains(g.boundary, p_point)
    ) THEN
        RETURN NULL;
    END IF;

    -- Aggregate metrics filtered ONLY to the 5 valid event types
    WITH matching_events AS (
        SELECT e.vehicle_id, e.time, e.speed, e.location,
               CASE
                 WHEN LAG(e.time) OVER (PARTITION BY e.vehicle_id ORDER BY e.time) IS NULL
                   OR e.time - LAG(e.time) OVER (PARTITION BY e.vehicle_id ORDER BY e.time) > incident_burst_window()
                 THEN 1 ELSE 0
               END AS starts_incident
        FROM vehicle_events e
        WHERE e.location IS NOT NULL
          AND e.location && ST_Expand(p_point, v_deg_delta)
          AND e.time >= NOW() - p_window
          AND ST_DWithin(e.location::geography, p_point::geography, v_radius_m)
          -- STRICT EVENT TYPE FILTERING
          AND (
              (e.event_category = 'green_driving_type' AND e.event_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering'))
              OR (e.event_category = 'over_speeding')
              OR (e.event_category = 'crash_detection' AND e.event_detail LIKE '%device is calibrated%')
          )
    ),
    incidents AS (
        SELECT starts_incident, vehicle_id, time, speed, location
        FROM matching_events
    )
    SELECT
        SUM(starts_incident),
        COUNT(*),
        COUNT(DISTINCT vehicle_id),
        COUNT(DISTINCT time::date),
        ROUND(AVG(speed)),
        ST_Centroid(ST_Collect(location)),
        MAX(time)
    INTO
        v_incidents, v_events, v_vehicles, v_days, v_avg_speed,
        v_centroid, v_last_time
    FROM incidents;

    -- Early threshold exit
    IF v_incidents IS NULL OR v_incidents < p_min_incidents THEN
        RETURN NULL;
    END IF;

    -- Extract dominant event type key across incidents
    WITH matching_events AS (
        SELECT e.vehicle_id, e.time,
               CASE 
                   WHEN e.event_category = 'green_driving_type' THEN e.event_detail
                   WHEN e.event_category = 'over_speeding' THEN 'over_speeding'
                   WHEN e.event_category = 'crash_detection' THEN 'crash_detection'
               END AS event_type_key,
               CASE
                 WHEN LAG(e.time) OVER (PARTITION BY e.vehicle_id ORDER BY e.time) IS NULL
                   OR e.time - LAG(e.time) OVER (PARTITION BY e.vehicle_id ORDER BY e.time) > incident_burst_window()
                 THEN 1 ELSE 0
               END AS starts_incident
        FROM vehicle_events e
        WHERE e.location IS NOT NULL
          AND e.location && ST_Expand(p_point, v_deg_delta)
          AND e.time >= NOW() - p_window
          AND ST_DWithin(e.location::geography, p_point::geography, v_radius_m)
          AND (
              (e.event_category = 'green_driving_type' AND e.event_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering'))
              OR (e.event_category = 'over_speeding')
              OR (e.event_category = 'crash_detection' AND e.event_detail LIKE '%device is calibrated%')
          )
    ),
    incidents AS (
        SELECT vehicle_id, event_type_key, time,
               SUM(starts_incident) OVER (PARTITION BY vehicle_id ORDER BY time) AS incident_no
        FROM matching_events
    ),
    incident_types AS (
        SELECT (array_agg(event_type_key ORDER BY time))[1] AS detail_key
        FROM incidents
        GROUP BY vehicle_id, incident_no
    )
    SELECT detail_key INTO v_type_key
    FROM incident_types
    GROUP BY detail_key
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    -- Map key to exact requested title display
    v_label := CASE v_type_key
        WHEN 'harsh_braking'      THEN 'Harsh braking'
        WHEN 'harsh_acceleration' THEN 'Harsh acceleration'
        WHEN 'harsh_cornering'    THEN 'Harsh cornering'
        WHEN 'over_speeding'      THEN 'Overspeeding'
        WHEN 'crash_detection'   THEN 'Crash detection'
        ELSE 'Hotspot'
    END;

    v_area := describe_point_area(ST_Y(v_centroid), ST_X(v_centroid));

    -- Formatted Compact Geofence Name (Safe for API 6MB payload limit)
    v_name := LEFT(
        COALESCE(NULLIF(v_area, '') || ' - ', '')
        || v_label
        || ' (' || v_incidents || ' instances, '
        || v_vehicles || ' vehicles, ~avg speed '
        || COALESCE(v_avg_speed, 0) || ' km/h)',
        255
    );

    -- Insert geofence with standardized hotspot_kind
    INSERT INTO geofences (name, vehicle_id, boundary, trigger_type, source, hotspot_kind)
    VALUES (
        v_name, NULL,
        make_circular_geofence_boundary(ST_X(v_centroid), ST_Y(v_centroid), p_radius_km),
        'none', 'auto_hotspot', v_type_key
    )
    RETURNING id INTO v_id;

    INSERT INTO geofence_events (geofence_id, vehicle_id, event_type, location, speed, event_time)
    VALUES (v_id, NULL, 'hotspot_created', v_centroid, v_avg_speed, v_last_time);

    RETURN v_id;
END;
$$;
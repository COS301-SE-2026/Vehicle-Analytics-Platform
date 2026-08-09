-- Automatic event-hotspot geofences.
--
-- When 5 monitored safety INCIDENTS accumulate within R of each other, a
-- circular geofence is created so the hotspot shows on the map, and an
-- alert row is written to geofence_events for the Zone Alerts panel.


CREATE OR REPLACE FUNCTION monitored_event_categories()
RETURNS TEXT[]
LANGUAGE sql IMMUTABLE AS $$
    SELECT ARRAY['green_driving_type', 'crash_detection'];
$$;

-- Gap above which two events from the same vehicle are separate incidents.
CREATE OR REPLACE FUNCTION incident_burst_window()
RETURNS INTERVAL LANGUAGE sql IMMUTABLE AS $$ SELECT INTERVAL '60 seconds'; $$;

-- Speed below which repeated impacts look like surface roughness or yard
-- maneuvering rather than a defect struck at road speed.
CREATE OR REPLACE FUNCTION hotspot_low_speed_kmh()
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$ SELECT 20; $$;

-- Best available human label for a point: road name, else suburb, city
CREATE OR REPLACE FUNCTION describe_point_area(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION
)
RETURNS TEXT
LANGUAGE plpgsql STABLE AS $$
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
    p_min_incidents INTEGER          DEFAULT 5,
    p_window        INTERVAL         DEFAULT INTERVAL '14 days'
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_radius_m   DOUBLE PRECISION := p_radius_km * 1000;
    v_incidents  INTEGER;
    v_events     INTEGER;
    v_vehicles   INTEGER;
    v_days       INTEGER;
    v_avg_speed  NUMERIC;
    v_centroid   GEOMETRY(POINT, 4326);
    v_details    TEXT;
    v_has_impact BOOLEAN;
    v_has_harsh  BOOLEAN;
    v_last_time  TIMESTAMPTZ;
    v_area       TEXT;
    v_kind       TEXT;
    v_label      TEXT;
    v_name       TEXT;
    v_id         BIGINT;
BEGIN
    IF p_point IS NULL THEN
        RETURN NULL;
    END IF;

    -- Dedup: skip if this point already falls inside an auto hotspot.
    -- Containment (not centre-distance) means hotspots chain along a road
    -- rather than collapsing to one zone per area
    IF EXISTS (
        SELECT 1 FROM geofences g
        WHERE g.source = 'auto_hotspot'
          AND g.boundary && p_point
          AND ST_Contains(g.boundary, p_point)
    ) THEN
        RETURN NULL;
    END IF;

    WITH nearby AS (
        SELECT e.vehicle_id, e.time, e.speed, e.location,
               e.event_category, e.event_detail,
               CASE
                 WHEN LAG(e.time) OVER (PARTITION BY e.vehicle_id ORDER BY e.time) IS NULL
                   OR e.time - LAG(e.time) OVER (PARTITION BY e.vehicle_id ORDER BY e.time)
                      > incident_burst_window()
                 THEN 1 ELSE 0
               END AS starts_incident
        FROM vehicle_events e
        WHERE e.location IS NOT NULL
          AND e.event_category = ANY (monitored_event_categories())
          -- Uncalibrated accelerometer readings aren't a trustworthy basis
          -- for a road-condition claim.
          AND COALESCE(e.event_detail, '') NOT LIKE '%not calibrated%'
          AND e.time >= NOW() - p_window
          AND ST_DWithin(e.location::geography, p_point::geography, v_radius_m)
    )
    SELECT SUM(starts_incident), COUNT(*), COUNT(DISTINCT vehicle_id),
           COUNT(DISTINCT time::date), ROUND(AVG(speed)),
           ST_Centroid(ST_Collect(location)),
           string_agg(DISTINCT COALESCE(event_detail, event_category), ', '),
           bool_or(event_category = 'crash_detection'),
           bool_or(event_category = 'green_driving_type'),
           MAX(time)
      INTO v_incidents, v_events, v_vehicles, v_days, v_avg_speed,
           v_centroid, v_details, v_has_impact, v_has_harsh, v_last_time
    FROM nearby;

    IF v_incidents IS NULL OR v_incidents < p_min_incidents THEN
        RETURN NULL;
    END IF;

    v_area := describe_point_area(ST_Y(v_centroid), ST_X(v_centroid));

    
    -- Readable name for the zone, shown on the map and in the Zone Alerts panel.
    v_name := COALESCE(NULLIF(v_area, '') || ' - ', '')
              || v_label
              || ' (' || v_incidents || ' incidents / ' || v_events || ' events, '
              || v_days || ' days, '
              || v_vehicles || ' vehicle' || CASE WHEN v_vehicles = 1 THEN '' ELSE 's' END
              || ', ~' || COALESCE(v_avg_speed, 0) || ' km/h)';

    -- trigger_type 'none': display-only. process_geofence_events_batch()
    -- only acts on 'entry'/'exit'/'both', so vehicles pass through these
    INSERT INTO geofences (name, vehicle_id, boundary, trigger_type, source, hotspot_kind)
    VALUES (
        v_name, NULL,
        make_circular_geofence_boundary(ST_X(v_centroid), ST_Y(v_centroid), p_radius_km),
        'none', 'auto_hotspot', v_kind
    )
    RETURNING id INTO v_id;

    INSERT INTO geofence_events (geofence_id, vehicle_id, event_type, location, speed, event_time)
    VALUES (v_id, NULL, 'hotspot_created', v_centroid, v_avg_speed, v_last_time);

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION detect_event_hotspots_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Looping rather than one set-based statement is intentional: each
    -- iteration must see hotspots created by earlier iterations, so two
    -- new events at the same spot in one batch don't create two zones.
    FOR rec IN
        SELECT DISTINCT ST_SetSRID(ST_MakePoint(ne.longitude, ne.latitude), 4326) AS pt
        FROM new_events ne
        WHERE ne.latitude IS NOT NULL
          AND ne.longitude IS NOT NULL
          AND ne.event_category = ANY (monitored_event_categories())
    LOOP
        PERFORM evaluate_event_hotspot(rec.pt);
    END LOOP;

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO telemetry_errors (vehicle_id, error_message, raw_payload)
    VALUES (NULL, 'Hotspot detection failure: ' || SQLERRM, NULL);
    RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_detect_event_hotspots
AFTER INSERT ON vehicle_events
REFERENCING NEW TABLE AS new_events
FOR EACH STATEMENT
EXECUTE FUNCTION detect_event_hotspots_batch();

-- Run detection over events already in the table. The trigger only sees
-- new inserts, so existing rows never trigger on their own.
CREATE OR REPLACE FUNCTION backfill_event_hotspots(
    p_days          INTEGER          DEFAULT 14,
    p_radius_km     DOUBLE PRECISION DEFAULT 0.25,
    p_min_incidents INTEGER          DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    rec    RECORD;
    v_id   BIGINT;
    v_made INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT DISTINCT e.location AS pt
        FROM vehicle_events e
        WHERE e.location IS NOT NULL
          AND e.event_category = ANY (monitored_event_categories())
          AND e.time >= NOW() - (p_days || ' days')::INTERVAL
    LOOP
        v_id := evaluate_event_hotspot(
            rec.pt, p_radius_km, p_min_incidents, (p_days || ' days')::INTERVAL
        );
        IF v_id IS NOT NULL THEN
            v_made := v_made + 1;
        END IF;
    END LOOP;

    RETURN v_made;
END;
$$;

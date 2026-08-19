-- Security events: towing, unplug, immobilizer.

CREATE OR REPLACE FUNCTION security_event_categories()
RETURNS TEXT[]
LANGUAGE sql IMMUTABLE AS $$
    SELECT ARRAY['towing', 'unplug', 'immobilizer'];
$$;

-- Radius of the marker zone. Small: this marks a point, it isn't an area
-- of interest like a hotspot.
CREATE OR REPLACE FUNCTION security_marker_radius_km()
RETURNS DOUBLE PRECISION LANGUAGE sql IMMUTABLE AS $$ SELECT 0.05; $$;

-- Suppression window: repeated events of the same category at the same
-- place within this period reuse the existing marker instead of stacking
-- new ones.
CREATE OR REPLACE FUNCTION security_marker_dedup_window()
RETURNS INTERVAL LANGUAGE sql IMMUTABLE AS $$ SELECT INTERVAL '6 hours'; $$;

CREATE OR REPLACE FUNCTION record_security_event(
    p_vehicle_id TEXT,
    p_category   TEXT,
    p_point      GEOMETRY(POINT, 4326),
    p_time       TIMESTAMPTZ,
    p_speed      INTEGER
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_radius_km DOUBLE PRECISION := security_marker_radius_km();
    v_area      TEXT;
    v_name      TEXT;
    v_id        BIGINT;
BEGIN
    IF p_point IS NULL THEN
        RETURN NULL;
    END IF;

    -- Reuse a recent marker of the same category covering this point.
    SELECT g.id INTO v_id
    FROM geofences g
    WHERE g.source = 'security_marker'
      AND g.hotspot_kind = p_category
      AND g.boundary && p_point
      AND ST_Contains(g.boundary, p_point)
      AND g.created_at >= NOW() - security_marker_dedup_window()
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        INSERT INTO geofence_events (geofence_id, vehicle_id, event_type, location, speed, event_time)
        VALUES (v_id, p_vehicle_id, 'security_alert', p_point, p_speed, p_time);
        RETURN v_id;
    END IF;

    v_area := describe_point_area(ST_Y(p_point), ST_X(p_point));

    v_name := COALESCE(NULLIF(v_area, '') || ' - ', '')
              || p_category || ' alert'
              || ' (' || p_vehicle_id || ', ' || to_char(p_time, 'YYYY-MM-DD HH24:MI') || ')';

    INSERT INTO geofences (name, vehicle_id, boundary, trigger_type, source, hotspot_kind)
    VALUES (
        v_name,
        p_vehicle_id,   -- attributable to one vehicle
        make_circular_geofence_boundary(ST_X(p_point), ST_Y(p_point), v_radius_km),
        'none',
        'security_marker',
        p_category
    )
    RETURNING id INTO v_id;

    INSERT INTO geofence_events (geofence_id, vehicle_id, event_type, location, speed, event_time)
    VALUES (v_id, p_vehicle_id, 'security_alert', p_point, p_speed, p_time);

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION detect_security_events_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT ne.vehicle_id, ne.event_category, ne.time, ne.speed,
               ST_SetSRID(ST_MakePoint(ne.longitude, ne.latitude), 4326) AS pt
        FROM new_events ne
        WHERE ne.latitude IS NOT NULL
          AND ne.longitude IS NOT NULL
          AND ne.event_category = ANY (security_event_categories())
        ORDER BY ne.time
    LOOP
        PERFORM record_security_event(
            rec.vehicle_id, rec.event_category, rec.pt, rec.time, rec.speed
        );
    END LOOP;

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO telemetry_errors (vehicle_id, error_message, raw_payload)
    VALUES (NULL, 'Security event handling failure: ' || SQLERRM, NULL);
    RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_detect_security_events
AFTER INSERT ON vehicle_events
REFERENCING NEW TABLE AS new_events
FOR EACH STATEMENT
EXECUTE FUNCTION detect_security_events_batch();

CREATE OR REPLACE FUNCTION backfill_security_events(p_days INTEGER DEFAULT 14)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    rec    RECORD;
    v_made INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT e.vehicle_id, e.event_category, e.time, e.speed, e.location AS pt
        FROM vehicle_events e
        WHERE e.location IS NOT NULL
          AND e.event_category = ANY (security_event_categories())
          AND e.time >= NOW() - (p_days || ' days')::INTERVAL
        ORDER BY e.time
    LOOP
        PERFORM record_security_event(
            rec.vehicle_id, rec.event_category, rec.pt, rec.time, rec.speed
        );
        v_made := v_made + 1;
    END LOOP;

    RETURN v_made;
END;
$$;

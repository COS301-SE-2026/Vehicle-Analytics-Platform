CREATE OR REPLACE FUNCTION get_trip_history_with_events(
    p_vehicle_id        TEXT,
    p_start_date        TIMESTAMPTZ DEFAULT NULL,
    p_end_date          TIMESTAMPTZ DEFAULT NULL,
    p_before_start_time TIMESTAMPTZ DEFAULT NULL,
    p_limit             INTEGER     DEFAULT 50
)
RETURNS TABLE (
    trip_id             BIGINT,
    vehicle_id          TEXT,
    start_time          TIMESTAMPTZ,
    end_time            TIMESTAMPTZ,
    distance_km         NUMERIC,
    duration_seconds    INTEGER,
    avg_speed_kmh       NUMERIC,
    max_speed_kmh       NUMERIC,
    status              TEXT,
    harsh_brakes        INTEGER,
    harsh_accelerations INTEGER,
    harsh_cornering     INTEGER,
    crashes             INTEGER,
    total_events        INTEGER,
    safety_score        INTEGER
)
LANGUAGE sql STABLE AS $$
    SELECT
        t.trip_id,
        t.vehicle_id,
        t.start_time,
        t.end_time,
        t.distance_km,
        t.duration_seconds,
        t.avg_speed_kmh,
        t.max_speed_kmh,
        t.status,
        COALESCE(ev.hb, 0)::INTEGER,
        COALESCE(ev.ha, 0)::INTEGER,
        COALESCE(ev.hc, 0)::INTEGER,
        COALESCE(ev.cr, 0)::INTEGER,
        COALESCE(ev.total, 0)::INTEGER,
        GREATEST(0, 100 - (COALESCE(ev.hb,0) * 2
                         + COALESCE(ev.ha,0) * 2
                         + COALESCE(ev.hc,0) * 1
                         + COALESCE(ev.cr,0) * 25))::INTEGER AS safety_score
    FROM trips t
    LEFT JOIN LATERAL (
        SELECT
            COUNT(*) FILTER (WHERE b.event_detail = 'harsh_braking')      AS hb,
            COUNT(*) FILTER (WHERE b.event_detail = 'harsh_acceleration') AS ha,
            COUNT(*) FILTER (WHERE b.event_detail = 'harsh_cornering')    AS hc,
            COUNT(*) FILTER (WHERE b.event_category = 'crash_detection')  AS cr,
            COUNT(*)                                                      AS total
        FROM (
            SELECT
                e.event_category,
                e.event_detail,
                CASE
                  WHEN LAG(e.time) OVER w IS NULL
                    OR e.time - LAG(e.time) OVER w > incident_burst_window()
                  THEN 1 ELSE 0
                END AS starts_incident
            FROM vehicle_events e
            WHERE e.vehicle_id = t.vehicle_id
              AND e.time BETWEEN t.start_time AND COALESCE(t.end_time, NOW())
              AND e.event_category IN ('green_driving_type', 'crash_detection')
              AND COALESCE(e.event_detail, '') NOT LIKE '%not calibrated%'
            WINDOW w AS (PARTITION BY e.event_category, e.event_detail ORDER BY e.time)
        ) b
        WHERE b.starts_incident = 1
    ) ev ON TRUE
    WHERE t.vehicle_id = p_vehicle_id
      AND (p_start_date IS NULL OR t.start_time >= p_start_date)
      AND (p_end_date   IS NULL OR t.end_time IS NULL OR t.end_time <= p_end_date)
      AND (p_before_start_time IS NULL OR t.start_time < p_before_start_time)
    ORDER BY t.start_time DESC
    LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION get_trip_replay_detail(p_trip_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql STABLE AS $$
DECLARE
    t        RECORD;
    v_points JSON;
    v_events JSON;
BEGIN
    SELECT trip_id, vehicle_id, start_time, COALESCE(end_time, NOW()) AS end_time,
           start_latitude, start_longitude, end_latitude, end_longitude
      INTO t
    FROM trips WHERE trip_id = p_trip_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip % not found', p_trip_id;
    END IF;

    SELECT COALESCE(json_agg(json_build_object(
               'time', ct.time,
               'latitude', ct.latitude,
               'longitude', ct.longitude,
               'speed', ct.speed,
               'colour', CASE
                            WHEN ct.speed IS NULL   THEN '#9ca3af'
                            WHEN ct.speed > 100     THEN '#C0392B'
                            WHEN ct.speed > 60      THEN '#f59e0b'
                            ELSE '#4D7C5F'
                         END
           ) ORDER BY ct.time), '[]'::json)
      INTO v_points
    FROM clean_telemetry ct
    WHERE ct.vehicle_id = t.vehicle_id
      AND ct.measurement = 'avl'
      AND ct.time BETWEEN t.start_time AND t.end_time
      AND ct.latitude IS NOT NULL AND ct.longitude IS NOT NULL;

    -- Real events, bracketed by synthetic trip_started / trip_ended markers
    -- that EventTimeline styles differently from incidents.
    SELECT COALESCE(json_agg(x ORDER BY (x->>'time')::timestamptz), '[]'::json)
      INTO v_events
    FROM (
        SELECT json_build_object(
                   'type', 'trip_started', 'time', t.start_time,
                   'latitude', t.start_latitude, 'longitude', t.start_longitude
               ) AS x
        UNION ALL
        SELECT json_build_object(
                   'type', COALESCE(e.event_detail, e.event_category),
                   'time', e.time,
                   'latitude', e.latitude, 'longitude', e.longitude,
                   'speed', e.speed
               )
        FROM vehicle_events e
        WHERE e.vehicle_id = t.vehicle_id
          AND e.time BETWEEN t.start_time AND t.end_time
          AND e.event_category IN ('green_driving_type', 'crash_detection')
          AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
        UNION ALL
        SELECT json_build_object(
                   'type', 'trip_ended', 'time', t.end_time,
                   'latitude', t.end_latitude, 'longitude', t.end_longitude
               )
        WHERE t.end_latitude IS NOT NULL
    ) s;

    RETURN json_build_object('points', v_points, 'events', v_events);
END;
$$;

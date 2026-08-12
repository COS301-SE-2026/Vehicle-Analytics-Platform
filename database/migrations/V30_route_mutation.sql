-- Route mutation: assign, replace, retire.
--

ALTER TABLE routes ADD COLUMN IF NOT EXISTS source_trip_id BIGINT
    REFERENCES trips(trip_id) ON DELETE SET NULL;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS source_from TIMESTAMPTZ;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS source_to   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_routes_source_trip ON routes (source_trip_id);

-- Assign a route to a vehicle, derived from one of its completed trips.

CREATE OR REPLACE FUNCTION route_assign_from_trip(
    p_vehicle_id          TEXT,
    p_route_name          TEXT,
    p_trip_id             BIGINT,
    p_allowed_deviation_m INTEGER DEFAULT 150
)
RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
    g       RECORD;
    t       RECORD;
    v_route BIGINT;
BEGIN
    SELECT trip_id, vehicle_id, start_time, end_time INTO t
    FROM trips WHERE trip_id = p_trip_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip % not found', p_trip_id;
    END IF;

    IF t.vehicle_id <> p_vehicle_id THEN
        RAISE EXCEPTION
            'Trip % belongs to vehicle %, not % -- a route must be derived from the vehicle''s own trip',
            p_trip_id, t.vehicle_id, p_vehicle_id;
    END IF;

    SELECT * INTO g FROM route_generate_from_trip(p_trip_id);

    IF g.error IS NOT NULL THEN
        RAISE EXCEPTION 'Route generation failed: %', g.error;
    END IF;

    -- One active route per vehicle
    UPDATE routes SET active = FALSE, updated_at = NOW()
     WHERE vehicle_id = p_vehicle_id AND active;

    INSERT INTO routes (
        vehicle_id, route_name, allowed_deviation_m,
        geom, distance_m, estimated_time_s,
        source_trip_id, source_from, source_to
    )
    VALUES (
        p_vehicle_id, p_route_name, p_allowed_deviation_m,
        g.geom, g.distance_m, g.estimated_time_s,
        p_trip_id, t.start_time, t.end_time
    )
    RETURNING route_id INTO v_route;

    RETURN v_route;
END;
$$;

-- Assign from an explicit time window, for corridors that don't align to
-- trip boundaries
CREATE OR REPLACE FUNCTION route_assign_from_window(
    p_vehicle_id          TEXT,
    p_route_name          TEXT,
    p_from                TIMESTAMPTZ,
    p_to                  TIMESTAMPTZ,
    p_allowed_deviation_m INTEGER DEFAULT 150
)
RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
    g       RECORD;
    v_route BIGINT;
BEGIN
    SELECT * INTO g FROM route_generate_from_window(p_vehicle_id, p_from, p_to);

    IF g.error IS NOT NULL THEN
        RAISE EXCEPTION 'Route generation failed: %', g.error;
    END IF;

    UPDATE routes SET active = FALSE, updated_at = NOW()
     WHERE vehicle_id = p_vehicle_id AND active;

    INSERT INTO routes (
        vehicle_id, route_name, allowed_deviation_m,
        geom, distance_m, estimated_time_s,
        source_trip_id, source_from, source_to
    )
    VALUES (
        p_vehicle_id, p_route_name, p_allowed_deviation_m,
        g.geom, g.distance_m, g.estimated_time_s,
        NULL, p_from, p_to
    )
    RETURNING route_id INTO v_route;

    RETURN v_route;
END;
$$;

-- Replace an existing route's geometry from a different trip.
CREATE OR REPLACE FUNCTION route_replace_geometry(
    p_route_id BIGINT,
    p_trip_id  BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
    g RECORD;
    t RECORD;
    r RECORD;
BEGIN
    SELECT route_id, vehicle_id INTO r FROM routes WHERE route_id = p_route_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Route % not found', p_route_id;
    END IF;

    SELECT trip_id, vehicle_id, start_time, end_time INTO t
    FROM trips WHERE trip_id = p_trip_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip % not found', p_trip_id;
    END IF;

    IF t.vehicle_id <> r.vehicle_id THEN
        RAISE EXCEPTION 'Trip % belongs to vehicle %, but route % is for vehicle %',
            p_trip_id, t.vehicle_id, p_route_id, r.vehicle_id;
    END IF;

    SELECT * INTO g FROM route_generate_from_trip(p_trip_id);
    IF g.error IS NOT NULL THEN
        RAISE EXCEPTION 'Route generation failed: %', g.error;
    END IF;

    -- Updating geom fires trigger_reset_route_state 
    UPDATE routes
       SET geom             = g.geom,
           distance_m       = g.distance_m,
           estimated_time_s = g.estimated_time_s,
           source_trip_id   = p_trip_id,
           source_from      = t.start_time,
           source_to        = t.end_time,
           updated_at       = NOW()
     WHERE route_id = p_route_id;

    RETURN p_route_id;
END;
$$;

-- Rename / adjust tolerance / activate / deactivate.
CREATE OR REPLACE FUNCTION route_update_meta(
    p_route_id            BIGINT,
    p_route_name          TEXT    DEFAULT NULL,
    p_allowed_deviation_m INTEGER DEFAULT NULL,
    p_active              BOOLEAN DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql AS $$
BEGIN
    -- Reactivating must not collide with another active route for the same vehicle
    IF p_active THEN
        UPDATE routes r
           SET active = FALSE, updated_at = NOW()
          FROM routes target
         WHERE target.route_id = p_route_id
           AND r.vehicle_id = target.vehicle_id
           AND r.route_id <> p_route_id
           AND r.active;
    END IF;

    UPDATE routes
       SET route_name          = COALESCE(p_route_name, route_name),
           allowed_deviation_m = COALESCE(p_allowed_deviation_m, allowed_deviation_m),
           active              = COALESCE(p_active, active),
           updated_at          = NOW()
     WHERE route_id = p_route_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Route % not found', p_route_id;
    END IF;

    RETURN p_route_id;
END;
$$;
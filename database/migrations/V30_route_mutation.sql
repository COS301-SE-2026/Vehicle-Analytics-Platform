-- Route mutation: create and edit.
--
-- THE INVARIANT: routes.geom is ALWAYS the generated result of
-- route_waypoints for that route. Never edited independently.
--
-- Enforcing that as a convention ("remember to regenerate after editing")
-- only holds until one backend path updates geom directly -- after which
-- the stored corridor silently stops matching the manager's stops, with
-- nothing to catch it. Deviation alerts would then be measured against a
-- line nobody chose.
--
-- So both mutation paths live here as functions. Waypoints and geometry
-- are written in one statement, in one transaction: either both change or
-- neither does.
--
-- Deliberately NOT a trigger on route_waypoints. Regeneration runs
-- Dijkstra per waypoint pair -- far too expensive to fire per row, and a
-- delete-then-insert edit would fire it twice, generating a wrong
-- intermediate geometry from a half-empty waypoint list in between.

-- Create a route and assign it to a vehicle.
--
-- p_waypoints: '[{"lat":-25.75,"lng":28.22,"name":"Depot"}, ...]'
--
-- Returns the new route_id, or raises with the generation error -- the
-- manager needs to know WHY a route couldn't be drawn (waypoint off the
-- road network, disconnected legs), not just that it failed.
CREATE OR REPLACE FUNCTION route_create(
    p_vehicle_id          TEXT,
    p_route_name          TEXT,
    p_waypoints           JSON,
    p_allowed_deviation_m INTEGER DEFAULT 150
)
RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
    g        RECORD;
    v_route  BIGINT;
BEGIN
    SELECT * INTO g FROM route_generate(p_waypoints);

    IF g.error IS NOT NULL THEN
        RAISE EXCEPTION 'Route generation failed: %', g.error;
    END IF;

    -- One active route per vehicle (idx_routes_one_active_per_vehicle).
    -- Retire the previous one rather than deleting it: its deviation
    -- history stays queryable, and route_deviation_events keeps its FK.
    UPDATE routes
       SET active = FALSE, updated_at = NOW()
     WHERE vehicle_id = p_vehicle_id AND active;

    INSERT INTO routes (
        vehicle_id, route_name, allowed_deviation_m,
        geom, distance_m, estimated_time_s
    )
    VALUES (
        p_vehicle_id, p_route_name, p_allowed_deviation_m,
        g.geom, g.distance_m, g.estimated_time_s
    )
    RETURNING route_id INTO v_route;

    INSERT INTO route_waypoints (route_id, sequence, latitude, longitude, name)
    SELECT
        v_route,
        ordinality::INTEGER,
        (value ->> 'lat')::NUMERIC,
        (value ->> 'lng')::NUMERIC,
        value ->> 'name'
    FROM json_array_elements(p_waypoints) WITH ORDINALITY;

    RETURN v_route;
END;
$$;

-- Edit an existing route's stops.
--
-- Replace-in-place rather than diff-and-patch: the waypoint list is short
-- and its ORDER is the meaningful part, so reconciling individual rows
-- would be more code for no benefit. sequence is reassigned from array
-- position, which is what makes drag-to-reorder work on the frontend
-- without sending explicit indices.
CREATE OR REPLACE FUNCTION route_set_waypoints(
    p_route_id  BIGINT,
    p_waypoints JSON
)
RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
    g RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM routes WHERE route_id = p_route_id) THEN
        RAISE EXCEPTION 'Route % not found', p_route_id;
    END IF;

    -- Generate BEFORE mutating anything. If the new waypoint list can't
    -- produce a valid route, the existing one must survive untouched --
    -- otherwise a bad edit leaves a vehicle monitored against nothing.
    SELECT * INTO g FROM route_generate(p_waypoints);

    IF g.error IS NOT NULL THEN
        RAISE EXCEPTION 'Route generation failed: %', g.error;
    END IF;

    DELETE FROM route_waypoints WHERE route_id = p_route_id;

    INSERT INTO route_waypoints (route_id, sequence, latitude, longitude, name)
    SELECT
        p_route_id,
        ordinality::INTEGER,
        (value ->> 'lat')::NUMERIC,
        (value ->> 'lng')::NUMERIC,
        value ->> 'name'
    FROM json_array_elements(p_waypoints) WITH ORDINALITY;

    -- Updating geom fires trigger_reset_route_state (V29), which closes
    -- any open deviation incident and clears route_state -- correct, since
    -- an incident opened against the old corridor must not be resolved by
    -- a distance measured against the new one.
    UPDATE routes
       SET geom             = g.geom,
           distance_m       = g.distance_m,
           estimated_time_s = g.estimated_time_s,
           updated_at       = NOW()
     WHERE route_id = p_route_id;

    RETURN p_route_id;
END;
$$;

-- Rename / adjust tolerance / activate / deactivate. Separate from
-- waypoint editing because none of these touch geometry, so there's no
-- reason to pay for regeneration.
CREATE OR REPLACE FUNCTION route_update_meta(
    p_route_id            BIGINT,
    p_route_name          TEXT    DEFAULT NULL,
    p_allowed_deviation_m INTEGER DEFAULT NULL,
    p_active              BOOLEAN DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql AS $$
BEGIN
    -- Reactivating must not collide with another active route for the same
    -- vehicle -- the partial unique index would reject it with a
    -- constraint error the manager can't interpret.
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

-- The waypoint list for the edit UI, in order.
CREATE OR REPLACE FUNCTION get_route_waypoints(p_route_id BIGINT)
RETURNS TABLE (
    waypoint_id BIGINT,
    sequence    INTEGER,
    latitude    NUMERIC,
    longitude   NUMERIC,
    name        TEXT
)
LANGUAGE sql STABLE AS $$
    SELECT waypoint_id, sequence, latitude, longitude, name
    FROM route_waypoints
    WHERE route_id = p_route_id
    ORDER BY sequence;
$$;

-- ---------------------------------------------------------------------------
-- Consistency check.
--
-- The functions above are the only intended write path, but nothing
-- physically prevents a direct UPDATE routes SET geom. This surfaces any
-- route whose stored geometry no longer matches its waypoints -- run it if
-- deviation alerts ever look inexplicable.
--
-- Compares endpoints rather than the full line: a route's geometry should
-- start near its first waypoint and end near its last. Cheap, and catches
-- the realistic failure (geometry replaced or waypoints edited alone)
-- without re-running Dijkstra to compare paths.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_route_consistency()
RETURNS TABLE (
    route_id        BIGINT,
    vehicle_id      TEXT,
    route_name      TEXT,
    waypoint_count  BIGINT,
    start_gap_m     DOUBLE PRECISION,
    end_gap_m       DOUBLE PRECISION
)
LANGUAGE sql STABLE AS $$
    SELECT
        r.route_id,
        r.vehicle_id,
        r.route_name,
        w.n,
        ST_Distance(ST_StartPoint(r.geom)::geography, w.first_pt::geography),
        ST_Distance(ST_EndPoint(r.geom)::geography,   w.last_pt::geography)
    FROM routes r
    JOIN LATERAL (
        SELECT COUNT(*) AS n,
               (array_agg(location ORDER BY sequence))[1]      AS first_pt,
               (array_agg(location ORDER BY sequence DESC))[1] AS last_pt
        FROM route_waypoints WHERE route_id = r.route_id
    ) w ON TRUE
    WHERE r.active
      -- 2km: generated geometry snaps to the nearest ROAD, so some gap
      -- from the manager's raw click is expected and fine. This flags
      -- genuine mismatches, not normal snapping.
      AND (w.n = 0
        OR ST_Distance(ST_StartPoint(r.geom)::geography, w.first_pt::geography) > 2000
        OR ST_Distance(ST_EndPoint(r.geom)::geography,   w.last_pt::geography)  > 2000);
$$;
-- Route generation: manager waypoints -> road-snapped LINESTRING.
--
-- Runs ONLY when a route is created or edited, never in the telemetry
-- path. That's the whole point of storing the generated geometry: live
-- monitoring is then a single ST_DWithin against a GIST-indexed line
-- (V28's trigger), which stays fast however many vehicles report.
--
-- REQUIRES build_road_topology() to have been run once (V26). Without it
-- roads.source/target are NULL, there is no graph, and every call here
-- returns NULL.

-- Nearest routable graph node to a lat/lng. The manager clicks anywhere on
-- the map; Dijkstra needs an actual vertex.
--
-- The 2km ceiling matters: without it this always returns SOMETHING, so a
-- click in the middle of nowhere silently snaps to a road tens of km away
-- and produces a route bearing no relation to what the manager drew. NULL
-- is the honest answer there, and route_generate turns it into a clear
-- error rather than a nonsense line.
-- LANGUAGE plpgsql, not sql: roads_vertices_pgr is created at RUNTIME by
-- pgr_createTopology(), not by any migration, so it does not exist when
-- this file is applied. Postgres fully resolves SQL-language function
-- bodies at CREATE time, so a sql version fails with
-- "relation roads_vertices_pgr does not exist" -- and because psql keeps
-- going, the functions after it get created anyway, leaving V28 half
-- applied. plpgsql defers name resolution to first call.
CREATE OR REPLACE FUNCTION nearest_route_node(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_max_distance_m DOUBLE PRECISION DEFAULT 2000
)
RETURNS BIGINT
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_id BIGINT;
BEGIN
    IF to_regclass('public.roads_vertices_pgr') IS NULL THEN
        RAISE EXCEPTION
            'Road topology not built. Run: SELECT build_road_topology();';
    END IF;

    SELECT v.id INTO v_id
    FROM roads_vertices_pgr v
    WHERE v.the_geom && ST_Expand(ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326), 0.02)
      AND ST_DWithin(
            v.the_geom::geography,
            ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
            p_max_distance_m
          )
    ORDER BY v.the_geom <-> ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)
    LIMIT 1;

    RETURN v_id;
END;
$$;

-- Shortest path between two graph nodes, as a single merged LINESTRING.
CREATE OR REPLACE FUNCTION route_segment_geom(
    p_source BIGINT,
    p_target BIGINT
)
RETURNS GEOMETRY(LINESTRING, 4326)
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_geom GEOMETRY;
BEGIN
    IF p_source IS NULL OR p_target IS NULL OR p_source = p_target THEN
        RETURN NULL;
    END IF;

    -- directed := false -- this is an expected corridor, not directions.
    -- Nobody drives it, so one-way restrictions are deliberately ignored;
    -- honouring them would only produce longer corridors that real buses
    -- then appear to deviate from.
    SELECT ST_LineMerge(ST_Collect(r.geom ORDER BY d.seq))
      INTO v_geom
    FROM pgr_dijkstra(
            'SELECT id, source, target, cost, reverse_cost FROM roads WHERE source IS NOT NULL',
            p_source, p_target, directed := false
         ) d
    JOIN roads r ON r.id = d.edge
    WHERE d.edge <> -1;   -- -1 marks the terminating row, which has no edge

    -- ST_LineMerge yields a MULTILINESTRING when the path has a gap --
    -- which is exactly the un-noded-network symptom described in V26.
    -- Returning NULL rather than a broken geometry makes that visible at
    -- generation time instead of as mysterious deviation alerts later.
    IF v_geom IS NULL OR GeometryType(v_geom) <> 'LINESTRING' THEN
        RETURN NULL;
    END IF;

    RETURN v_geom::GEOMETRY(LINESTRING, 4326);
END;
$$;

-- Generate a route through an ordered waypoint list.
--
-- p_waypoints is a JSON array: '[{"lat":-25.75,"lng":28.22}, ...]'
--
-- Returns the geometry plus distance/time so the frontend can preview
-- before the manager commits. Nothing is persisted here -- saving is a
-- separate call, matching the two-step Generate / Assign flow.
CREATE OR REPLACE FUNCTION route_generate(p_waypoints JSON)
RETURNS TABLE (
    geom             GEOMETRY(LINESTRING, 4326),
    distance_m       DOUBLE PRECISION,
    estimated_time_s INTEGER,
    error            TEXT
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_pts      JSON[];
    v_n        INTEGER;
    v_i        INTEGER;
    v_from     BIGINT;
    v_to       BIGINT;
    v_seg      GEOMETRY;
    v_segments GEOMETRY[] := '{}';
    v_full     GEOMETRY;
    v_dist     DOUBLE PRECISION;
BEGIN
    SELECT array_agg(value) INTO v_pts FROM json_array_elements(p_waypoints);
    v_n := COALESCE(array_length(v_pts, 1), 0);

    IF v_n < 2 THEN
        RETURN QUERY SELECT NULL::GEOMETRY(LINESTRING,4326), NULL::DOUBLE PRECISION,
                            NULL::INTEGER, 'At least two waypoints are required'::TEXT;
        RETURN;
    END IF;

    -- One Dijkstra call per consecutive pair, then merge. Routing all
    -- waypoints at once would let the solver reorder them -- the manager's
    -- sequence is the point, so each leg is solved independently.
    FOR v_i IN 1 .. v_n - 1 LOOP
        v_from := nearest_route_node(
            (v_pts[v_i]   ->> 'lat')::DOUBLE PRECISION,
            (v_pts[v_i]   ->> 'lng')::DOUBLE PRECISION);
        v_to   := nearest_route_node(
            (v_pts[v_i+1] ->> 'lat')::DOUBLE PRECISION,
            (v_pts[v_i+1] ->> 'lng')::DOUBLE PRECISION);

        IF v_from IS NULL OR v_to IS NULL THEN
            RETURN QUERY SELECT NULL::GEOMETRY(LINESTRING,4326), NULL::DOUBLE PRECISION,
                                NULL::INTEGER,
                                format('Waypoint %s is not within 2km of any mapped road',
                                       CASE WHEN v_from IS NULL THEN v_i ELSE v_i+1 END)::TEXT;
            RETURN;
        END IF;

        v_seg := route_segment_geom(v_from, v_to);

        IF v_seg IS NULL THEN
            RETURN QUERY SELECT NULL::GEOMETRY(LINESTRING,4326), NULL::DOUBLE PRECISION,
                                NULL::INTEGER,
                                format('No connected road path between waypoints %s and %s',
                                       v_i, v_i+1)::TEXT;
            RETURN;
        END IF;

        v_segments := v_segments || v_seg;
    END LOOP;

    v_full := ST_LineMerge(ST_Collect(v_segments));

    IF GeometryType(v_full) <> 'LINESTRING' THEN
        RETURN QUERY SELECT NULL::GEOMETRY(LINESTRING,4326), NULL::DOUBLE PRECISION,
                            NULL::INTEGER,
                            'Route legs do not join into a continuous line'::TEXT;
        RETURN;
    END IF;

    v_dist := ST_Length(v_full::geography);

    RETURN QUERY SELECT
        v_full::GEOMETRY(LINESTRING,4326),
        v_dist,
        -- Rough estimate at 40 km/h average -- an urban shuttle figure
        -- including stops. Deliberately crude: nothing depends on it, it's
        -- a display value the manager can sanity-check the route against.
        (v_dist / 1000.0 / 40.0 * 3600)::INTEGER,
        NULL::TEXT;
END;
$$;
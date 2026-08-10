-- Routing topology for the roads network.
--
-- WHY THIS MIGRATION DOES NOT BUILD THE TOPOLOGY
--
-- pgr_createTopology() over the ~1.59M rows in `roads` runs for tens of
-- minutes. Every migration in this set is applied end-to-end against a
-- fresh database in CI, so putting the build here would time out every
-- pipeline run and every local rebuild.
--
-- So: this migration installs the extension, adds the columns, and
-- defines build_road_topology() -- but you invoke that ONCE, manually,
-- after the OSM import:
--
--   SELECT build_road_topology();
--
-- It's idempotent-ish (safe to re-run) but there's no reason to.
--
-- WHAT THE TOPOLOGY IS FOR
--
-- PostGIS has no shortest-path function -- pgr_dijkstra lives in
-- pgRouting. Dijkstra walks a GRAPH: "from node N, which edges leave it,
-- and what do they cost?" That needs every road row to carry integer
-- source/target node ids so edges join to each other. `roads` as imported
-- by osm2pgsql has geometry but no nodes, so there is nothing to walk.
--
-- Note this is unrelated to CLUSTER-ing the table. Physical row ordering
-- speeds up SPATIAL queries (what's near this point). Dijkstra asks a
-- graph question, not a spatial one -- proximity on disk is not adjacency
-- in a network.
--
-- Also note postgis_topology (already installed in V1) is NOT pgRouting.
-- It's PostGIS's model for shared polygon boundaries and faces.

CREATE EXTENSION IF NOT EXISTS pgrouting;

-- pgr_createTopology writes into these.
ALTER TABLE roads ADD COLUMN IF NOT EXISTS source INTEGER;
ALTER TABLE roads ADD COLUMN IF NOT EXISTS target INTEGER;

-- Traversal cost. Length in metres, so Dijkstra minimises distance.
-- reverse_cost mirrors it: routes here are an expected CORRIDOR for
-- deviation monitoring, not turn-by-turn directions given to a driver, so
-- one-way restrictions are deliberately ignored -- nothing acts on this
-- geometry as instructions.
ALTER TABLE roads ADD COLUMN IF NOT EXISTS cost DOUBLE PRECISION;
ALTER TABLE roads ADD COLUMN IF NOT EXISTS reverse_cost DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_roads_source ON roads (source);
CREATE INDEX IF NOT EXISTS idx_roads_target ON roads (target);

-- Run once, manually, after the OSM import. Expect tens of minutes.
CREATE OR REPLACE FUNCTION build_road_topology(
    p_tolerance DOUBLE PRECISION DEFAULT 0.00001   -- ~1m; snaps near-coincident endpoints
)
RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
    v_result TEXT;
    v_nodes  BIGINT;
    v_edges  BIGINT;
BEGIN
    -- Cost in metres. Geography cast so this is real distance, not degrees.
    UPDATE roads
       SET cost = ST_Length(geom::geography),
           reverse_cost = ST_Length(geom::geography)
     WHERE cost IS NULL;

    -- Assigns source/target node ids to every edge endpoint and builds
    -- the roads_vertices_pgr node table.
    SELECT pgr_createTopology('roads', p_tolerance, 'geom', 'id')
      INTO v_result;

    SELECT COUNT(*) INTO v_nodes FROM roads_vertices_pgr;
    SELECT COUNT(*) INTO v_edges FROM roads WHERE source IS NOT NULL AND target IS NOT NULL;

    ANALYZE roads;

    RETURN format('%s -- %s nodes, %s routable edges', v_result, v_nodes, v_edges);
END;
$$;

-- Diagnostic. Run after build_road_topology() to see whether the graph is
-- actually connected.
--
-- LANGUAGE plpgsql, not sql, deliberately: roads_vertices_pgr does not
-- exist until pgr_createTopology() has run, and Postgres fully parses
-- SQL-language function bodies at CREATE time -- so a sql version of this
-- cannot be defined before the topology is built, which is exactly when
-- you need the migration to apply. plpgsql defers name resolution to
-- runtime, and the guard below turns "not built yet" into a clear message
-- instead of a relation-does-not-exist error.
--
-- THE NODING CAVEAT: pgr_createTopology only joins ways that SHARE AN
-- ENDPOINT. An OSM way often runs straight through a junction as a single
-- row without being split there -- so a crossing road visually overlaps
-- but is NOT connected in the graph. Dijkstra then either finds no path or
-- detours absurdly around the gap.
--
-- For this feature a detour is not cosmetic: the route is the corridor
-- deviation is measured against, so a bogus detour produces false
-- OFF_ROUTE alerts for buses driving perfectly normally.
--
-- If dead_end_nodes is a large fraction of total_nodes, the network needs
-- splitting at intersections -- either pgr_nodeNetwork('roads', ...)
-- (creates a larger roads_noded table) or a re-import via osm2pgrouting,
-- which splits on the way in.
CREATE OR REPLACE FUNCTION check_road_topology()
RETURNS TABLE (
    total_nodes    BIGINT,
    dead_end_nodes BIGINT,
    unrouted_edges BIGINT,
    total_edges    BIGINT,
    note           TEXT
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    IF to_regclass('public.roads_vertices_pgr') IS NULL THEN
        RETURN QUERY SELECT NULL::BIGINT, NULL::BIGINT, NULL::BIGINT,
                            (SELECT COUNT(*) FROM roads),
                            'Topology not built. Run: SELECT build_road_topology();'::TEXT;
        RETURN;
    END IF;

    -- Dead ends are counted from source/target directly rather than from
    -- roads_vertices_pgr.chk. chk is populated by pgr_analyzeGraph(), NOT
    -- by pgr_createTopology() -- reading it here would have reported 0
    -- dead ends on any freshly built topology and made a badly
    -- disconnected network look perfect.
    RETURN QUERY
    WITH degree AS (
        SELECT node, COUNT(*) AS deg
        FROM (
            SELECT source AS node FROM roads WHERE source IS NOT NULL
            UNION ALL
            SELECT target AS node FROM roads WHERE target IS NOT NULL
        ) endpoints
        GROUP BY node
    )
    SELECT
        (SELECT COUNT(*) FROM roads_vertices_pgr),
        (SELECT COUNT(*) FROM degree WHERE deg = 1),
        (SELECT COUNT(*) FROM roads WHERE source IS NULL OR target IS NULL),
        (SELECT COUNT(*) FROM roads),
        NULL::TEXT;
END;
$$;
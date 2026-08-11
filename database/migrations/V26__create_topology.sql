-- Routing network verification.
-- ROUTING USES `ways`, GEOCODING STILL USES `roads`
-- osm2pgrouting produces its own schema (ways, ways_vertices_pgr)

CREATE EXTENSION IF NOT EXISTS pgrouting;

DO $CHECK$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgrouting') THEN
        RAISE EXCEPTION
            'pgrouting extension is not installed. Install the OS package '
            '(e.g. apt-get install postgresql-16-pgrouting), then re-run.';
    END IF;
END
$CHECK$;

-- Spatial index for nearest-node lookup (V28). osm2pgrouting creates the
-- tables and their primary keys but not this.
DO $IDX$
BEGIN
    IF to_regclass('public.ways_vertices_pgr') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_ways_vertices_geom
            ON ways_vertices_pgr USING GIST (the_geom);
        CREATE INDEX IF NOT EXISTS idx_ways_source ON ways (source);
        CREATE INDEX IF NOT EXISTS idx_ways_target ON ways (target);
        CREATE INDEX IF NOT EXISTS idx_ways_geom ON ways USING GIST (the_geom);
        ANALYZE ways;
        ANALYZE ways_vertices_pgr;
    END IF;
END
$IDX$;

-- Connectivity check. Run after the osm2pgrouting import.
CREATE OR REPLACE FUNCTION check_road_topology()
RETURNS TABLE (
    total_nodes    BIGINT,
    dead_end_nodes BIGINT,
    avg_degree     NUMERIC,
    total_edges    BIGINT,
    note           TEXT
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_nodes BIGINT;
BEGIN
    IF to_regclass('public.ways_vertices_pgr') IS NULL THEN
        RETURN QUERY SELECT NULL::BIGINT, NULL::BIGINT, NULL::NUMERIC, NULL::BIGINT,
            'Routing network not imported. Run osm2pgrouting -- see database/osm/README.md'::TEXT;
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_nodes FROM ways_vertices_pgr;

    IF v_nodes = 0 THEN
        RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, NULL::NUMERIC, 0::BIGINT,
            'ways_vertices_pgr is empty -- the import produced no nodes.'::TEXT;
        RETURN;
    END IF;

    RETURN QUERY
    WITH degree AS (
        SELECT node, COUNT(*) AS deg
        FROM (
            SELECT source AS node FROM ways WHERE source IS NOT NULL
            UNION ALL
            SELECT target AS node FROM ways WHERE target IS NOT NULL
        ) endpoints
        GROUP BY node
    )
    SELECT
        v_nodes,
        (SELECT COUNT(*) FROM degree WHERE deg = 1),
        ROUND((SELECT AVG(deg) FROM degree), 2),
        (SELECT COUNT(*) FROM ways),
        NULL::TEXT;
END;
$$;
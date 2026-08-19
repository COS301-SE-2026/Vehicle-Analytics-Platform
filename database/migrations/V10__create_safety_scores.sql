-- Table A: one row per vehicle per day, the final safety score.
CREATE TABLE IF NOT EXISTS driver_daily_safety_scores (
    id SERIAL PRIMARY KEY,
    vehicle_id TEXT NOT NULL,
    score_date DATE NOT NULL,
    safety_score INTEGER DEFAULT 100,
    harsh_brakes INTEGER DEFAULT 0,
    harsh_accelerations INTEGER DEFAULT 0,
    harsh_cornering INTEGER DEFAULT 0,
    crashes INTEGER DEFAULT 0,
    total_events INTEGER DEFAULT 0,
    classification VARCHAR(20) DEFAULT 'Good',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vehicle_id, score_date)
);

CREATE INDEX IF NOT EXISTS idx_driver_safety_vehicle ON driver_daily_safety_scores(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_driver_safety_date ON driver_daily_safety_scores(score_date DESC);

-- Table B: alerts written by the frontend when it receives them. Kept as
-- the write path deliberately (not derived purely from vehicle_events) so
-- penalty weighting can be adjusted dynamically at the app layer -- e.g.
-- discounting harsh-braking penalties during confirmed bad-weather periods
-- -- without a schema change.
--
-- Built as a hypertable from creation. NOTE: TimescaleDB requires any
-- PRIMARY KEY / UNIQUE constraint on a hypertable to include the
-- partitioning column, so `id` alone can't be the primary key here -- it's
-- a composite (id, event_time) instead. The separate UNIQUE(vehicle_id,
-- event_time, event_type) constraint is what actually prevents a retried
-- frontend call from double-counting the same alert.
CREATE TABLE IF NOT EXISTS vehicle_daily_events (
    id SERIAL,
    vehicle_id TEXT NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    event_type TEXT NOT NULL,
    event_category TEXT,
    event_detail TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    speed INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, event_time),
    UNIQUE (vehicle_id, event_time, event_type)
);

SELECT create_hypertable('vehicle_daily_events', by_range('event_time'));

CREATE INDEX IF NOT EXISTS idx_daily_events_vehicle ON vehicle_daily_events(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_daily_events_time ON vehicle_daily_events(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_daily_events_vehicle_time ON vehicle_daily_events(vehicle_id, event_time DESC);

-- Penalties, calculated automatically from vehicle_daily_events as a real
-- self-refreshing continuous aggregate (not a plain MATERIALIZED VIEW with
-- no refresh path -- nothing ever called REFRESH on that in the original
-- schema, so it went stale immediately).
CREATE MATERIALIZED VIEW vehicle_penalties
WITH (timescaledb.continuous) AS
SELECT
    vehicle_id,
    time_bucket('1 day', event_time) AS event_date,

    COUNT(*) FILTER (WHERE event_type = 'harsh_brake')        AS harsh_brakes,
    COUNT(*) FILTER (WHERE event_type = 'harsh_acceleration')  AS harsh_accelerations,
    COUNT(*) FILTER (WHERE event_type = 'harsh_cornering')     AS harsh_cornering,
    COUNT(*) FILTER (WHERE event_type = 'crash')                AS crashes,
    COUNT(*)                                                    AS total_events,

    (COUNT(*) FILTER (WHERE event_type = 'harsh_brake') * 2 +
     COUNT(*) FILTER (WHERE event_type = 'harsh_acceleration') * 2 +
     COUNT(*) FILTER (WHERE event_type = 'harsh_cornering') * 1 +
     COUNT(*) FILTER (WHERE event_type = 'crash') * 25) AS total_penalty_points

FROM vehicle_daily_events
GROUP BY vehicle_id, event_date;

SELECT add_continuous_aggregate_policy(
    'vehicle_penalties',
    start_offset      => INTERVAL '3 days',
    end_offset        => INTERVAL '5 minutes',
    schedule_interval  => INTERVAL '15 minutes'
);

CREATE INDEX idx_vehicle_penalties_vehicle ON vehicle_penalties (vehicle_id);
CREATE INDEX idx_vehicle_penalties_date ON vehicle_penalties (event_date DESC);

-- Score population: driver_daily_safety_scores previously had no code path
-- anywhere that wrote to it. This adds the classification logic as a single
-- source of truth, a function that upserts from vehicle_penalties for a
-- given day, and a scheduled job that finalizes yesterday and keeps today
-- running live.
CREATE OR REPLACE FUNCTION classify_safety_score(p_score INTEGER) RETURNS VARCHAR(20) AS $$
BEGIN
    RETURN CASE
        WHEN p_score >= 90 THEN 'Excellent'
        WHEN p_score >= 75 THEN 'Good'
        WHEN p_score >= 50 THEN 'Fair'
        ELSE 'Poor'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION refresh_daily_safety_scores(p_date DATE DEFAULT (CURRENT_DATE - 1))
RETURNS VOID AS $$
BEGIN
    INSERT INTO driver_daily_safety_scores (
        vehicle_id, score_date, safety_score,
        harsh_brakes, harsh_accelerations, harsh_cornering, crashes, total_events,
        classification, updated_at
    )
    SELECT
        vp.vehicle_id,
        vp.event_date::DATE,
        GREATEST(0, 100 - vp.total_penalty_points)::INTEGER AS safety_score,
        vp.harsh_brakes, vp.harsh_accelerations, vp.harsh_cornering, vp.crashes, vp.total_events,
        classify_safety_score(GREATEST(0, 100 - vp.total_penalty_points)::INTEGER),
        NOW()
    FROM vehicle_penalties vp
    WHERE vp.event_date::DATE = p_date
    ON CONFLICT (vehicle_id, score_date) DO UPDATE SET
        safety_score         = EXCLUDED.safety_score,
        harsh_brakes         = EXCLUDED.harsh_brakes,
        harsh_accelerations  = EXCLUDED.harsh_accelerations,
        harsh_cornering      = EXCLUDED.harsh_cornering,
        crashes              = EXCLUDED.crashes,
        total_events         = EXCLUDED.total_events,
        classification       = EXCLUDED.classification,
        updated_at           = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE refresh_daily_safety_scores_job(job_id INT, config JSONB)
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM refresh_daily_safety_scores(CURRENT_DATE - 1);
    PERFORM refresh_daily_safety_scores(CURRENT_DATE);
END;
$$;


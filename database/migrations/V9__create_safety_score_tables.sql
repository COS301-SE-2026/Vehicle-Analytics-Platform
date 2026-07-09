-- Table A

-- One row per vehicle per day, stores the final safety score for each vehicle per day.
 
-- look into yesterdays score



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



-- Table B

-- stores events written by the frontend when alerts are received.


CREATE TABLE IF NOT EXISTS vehicle_daily_events (

    id SERIAL PRIMARY KEY,

    vehicle_id TEXT NOT NULL,

    event_time TIMESTAMPTZ NOT NULL,

    event_type TEXT NOT NULL,

    event_category TEXT,

    event_detail TEXT,

    latitude NUMERIC,

    longitude NUMERIC,

    speed INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()


);


-- Indexes for A


CREATE INDEX IF NOT EXISTS idx_driver_safety_vehicle ON driver_daily_safety_scores(vehicle_id);



CREATE INDEX IF NOT EXISTS idx_driver_safety_date ON driver_daily_safety_scores(score_date DESC);




-- Indexes For B

CREATE INDEX IF NOT EXISTS idx_daily_events_vehicle ON vehicle_daily_events(vehicle_id);



CREATE INDEX IF NOT EXISTS idx_daily_events_time ON vehicle_daily_events(event_time DESC);



CREATE INDEX IF NOT EXISTS idx_daily_events_vehicle_time ON vehicle_daily_events(vehicle_id, event_time DESC);




-- Penalties

-- calculates penalties auto from vehicle_daily_events.

CREATE MATERIALIZED VIEW vehicle_penalties AS


SELECT 





    vehicle_id,


    DATE(event_time) AS event_date,


    COUNT(*) FILTER (WHERE event_type = 'harsh_brake') AS harsh_brakes,


    COUNT(*) FILTER (WHERE event_type = 'harsh_acceleration') AS harsh_accelerations,


    COUNT(*) FILTER (WHERE event_type = 'harsh_cornering') AS harsh_cornering,


    COUNT(*) FILTER (WHERE event_type = 'crash') AS crashes,


    COUNT(*) AS total_events,


    (COUNT(*) FILTER (WHERE event_type = 'harsh_brake') * 2 +


     COUNT(*) FILTER (WHERE event_type = 'harsh_acceleration') * 2 +


     COUNT(*) FILTER (WHERE event_type = 'harsh_cornering') * 1 +


     COUNT(*) FILTER (WHERE event_type = 'crash') * 25) AS total_penalty_points


FROM vehicle_daily_events


GROUP BY vehicle_id, DATE(event_time);




-- Index materialized


CREATE INDEX idx_vehicle_penalties_vehicle ON vehicle_penalties(vehicle_id);



CREATE INDEX idx_vehicle_penalties_date ON vehicle_penalties(event_date DESC);

	





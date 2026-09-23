-- Migration: V40__extract_alert_breach_functions.sql
-- Extracts each custom alert rule's "is this a breach?" check out of its
-- trigger and into a standalone SQL function. The trigger and the backtest
-- feature both call the same function, so they can never disagree on what
-- counts as a breach.

CREATE OR REPLACE FUNCTION alert_speed_breach(p_speed NUMERIC, p_params JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$ 
    SELECT p_speed > (p_params->>'max_speed_kmh')::NUMERIC
$$

CREATE OR REPLACE FUNCTION alert_time_breach(p_timestamp TIMESTAMPTZ, p_params JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$ 
    SELECT CASE
        WHEN  (p_params->>'start_time')::TIME > (p_params->>'end_time')::TIME THEN
            p_timestamp::TIME >= (p_params->>'start_time')::TIME
            OR p_timestamp::TIME < (p_params->>'end_time')::TIME
        ELSE
            p_timestamp::TIME >= (p_params->>'start_time')::TIME
            AND p_timestamp::TIME < (p_params->>'end_time')::TIME
        END
        AND (
            p_timestamp->'restricted_days' IS NULL
            OR p_params->'restricted_days' ? to_char(p_timestamp, 'Dy')
        )
$$;


CREATE OR REPLACE FUNCTION alert_score_breach(p_score NUMERIC, p_params JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_score < (p_params->>'min_score')::NUMERIC
$$;

CREATE OR REPLACE FUNCTION alert_trip_duration_breach(
  p_duration_minutes NUMERIC,
  p_params JSONB,
  p_key TEXT DEFAULT 'max_trip_minutes'
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_params ? p_key)
    AND p_duration_minutes > (p_params->>p_key)::NUMERIC
$$;



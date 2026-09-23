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
--Returns the most recent non-null odometer and position reading for a vehicle at or before a given time
--Used when opening or closing a trip
CREATE OR REPLACE FUNCTION get_last_known_position(
    p_vehicle_id TEXT,
    p_as_of_time TIMESTAMPTZ
)
RETURNS TABLE (
    total_odometer BIGINT,
    latitude NUMERIC,
    longitude NUMERIC
) AS $$
    SELECT total_odometer, latitude, longitude
    FROM clean_telemetry
    WHERE vehicle_id = p_vehicle_id
      AND measurement = 'avl'
      AND time <= p_as_of_time
      AND total_odometer IS NOT NULL
    ORDER BY time DESC
    LIMIT 1;
$$ LANGUAGE sql STABLE;
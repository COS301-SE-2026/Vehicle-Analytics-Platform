CREATE MATERIALIZED VIEW vehicle_daily_distance
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS day,
    vehicle_id,
    first(total_odometer, time) AS start_odometer,
    last(total_odometer, time)  AS end_odometer,
    GREATEST(0, (last(total_odometer, time) - first(total_odometer, time)) / 1000.0) AS distance_km
FROM clean_telemetry
WHERE measurement = 'avl'
GROUP BY day, vehicle_id;

SELECT add_continuous_aggregate_policy(
    'vehicle_daily_distance',
    start_offset      => INTERVAL '3 days',
    end_offset        => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);

CREATE INDEX IF NOT EXISTS idx_vehicle_daily_distance_vehicle
  ON vehicle_daily_distance (vehicle_id, day DESC);

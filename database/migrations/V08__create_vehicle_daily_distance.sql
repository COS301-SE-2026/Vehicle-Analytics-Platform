--Continuous Vehicle daily distance view

Create MATERIALIZED VIEW vehicle_daily_distance
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('5 minutes', time) AS bucket,
    vehicle_id,
    first(total_odometer, time) AS start_odometer,
    last(total_odometer, time) AS end_odometer,

    GREATEST(0, (last(total_odometer, time) - first(total_odometer, time)) / 1000.0) AS distance_km
FROM clean_telemetry
Where measurement = 'avl'
GROUP BY bucket, vehicle_id;

--Automatically refresh the materialized view every day at midnight
SELECT add_continuous_aggregate_policy(
    'vehicle_daily_distance',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '0 minutes',
    schedule_interval => INTERVAL '1 minute'
);
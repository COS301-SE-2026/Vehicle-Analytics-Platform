--V49
CREATE MATERIALIZED VIEW IF NOT EXISTS vehicle_speed_1min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', time) AS bucket,
    vehicle_id,
    max(speed)                  AS max_speed,
    first(latitude, time)       AS latitude,
    first(longitude, time)      AS longitude,
    count(*)                    AS readings
FROM clean_telemetry
GROUP BY bucket, vehicle_id
WITH NO DATA;

SELECT add_continuous_aggregate_policy(
    'vehicle_speed_1min',
    start_offset      => INTERVAL '1 day',
    end_offset        => INTERVAL '1 minute',
    schedule_interval => INTERVAL '5 minutes',
    if_not_exists     => true
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fleet_admin') THEN
    GRANT SELECT ON vehicle_speed_1min TO fleet_admin;
  END IF;
END
$$;
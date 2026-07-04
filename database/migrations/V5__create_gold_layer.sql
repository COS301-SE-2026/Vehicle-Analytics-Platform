-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Continuous aggregate for harsh driving
-- Counts events per vehicle per hour
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CREATE MATERIALIZED VIEW vehicle_events_hourly
  WITH (timescaledb.continuous) AS
  SELECT
    time_bucket('1 hour', time) AS bucket,
    vehicle_id,

    COUNT(*) FILTER (WHERE event_detail = 'harsh_braking') AS harsh_braking_count,
    COUNT(*) FILTER (WHERE event_detail = 'harsh_acceleration') AS harsh_acceleration_count,
    COUNT(*) FILTER (WHERE event_detail = 'harsh_cornering') AS harsh_cornering_count,
    COUNT(*) FILTER (WHERE event_category = 'crash_detection') AS crash_count,
    COUNT(*) AS total_harsh_events,

    AVG(speed) AS avg_event_speed,
    Max(speed) AS max_event_speed,
    (last(total_odometer, time) - first(total_odometer, time)) AS distance_traveled_between_events

FROM vehicle_events
GROUP BY bucket, vehicle_id;

-- Refresh policy
SELECT add_continuous_aggregate_policy(
  'vehicle_events_hourly',
  start_offset => '7 days',
  end_offset   => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes'
);

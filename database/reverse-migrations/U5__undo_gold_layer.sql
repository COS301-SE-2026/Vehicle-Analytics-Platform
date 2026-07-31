SELECT remove_continuous_aggregate_policy('vehicle_events_hourly', if_exists => TRUE);
DROP MATERIALIZED VIEW IF EXISTS vehicle_events_hourly CASCADE;
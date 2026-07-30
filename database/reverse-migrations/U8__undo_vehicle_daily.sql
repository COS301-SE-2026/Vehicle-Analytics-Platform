SELECT remove_continuous_aggregate_policy('vehicle_daily_distance', if_exists => TRUE);
DROP MATERIALIZED VIEW IF EXISTS vehicle_daily_distance;
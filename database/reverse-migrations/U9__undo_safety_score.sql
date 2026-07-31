DROP TABLE IF EXISTS driver_daily_safety_scores CASCADE;
DROP TABLE IF EXISTS vehicle_daily_events CASCADE;

DROP INDEX IF EXISTS idx_driver_safety_vehicle ON driver_daily_safety_scores(vehicle_id);
DROP INDEX IF EXISTS idx_driver_safety_date ON driver_daily_safety_scores(score_date);
DROP INDEX IF EXISTS idx_daily_events_vehicle ON vehicle_daily_events(vehicle_id);
DROP INDEX IF EXISTS idx_daily_events_time ON vehicle_daily_events(event_time );
DROP INDEX IF EXISTS idx_daily_events_vehicle_time ON vehicle_daily_events(vehicle_id, event_time);

DROP MATERIALIZED VIEW IF EXISTS vehicle_penalties;

DROP INDEX IF EXISTS idx_vehicle_penalties_vehicle ON vehicle_penalties(vehicle_id);
DROP INDEX IF EXISTS idx_vehicle_penalties_date ON vehicle_penalties(event_date);
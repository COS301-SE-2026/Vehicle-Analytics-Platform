-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Latest position per vehicle
-- Used by: GET /vehicles (map markers)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE MATERIALIZED VIEW vehicle_latest_position AS
SELECT DISTINCT ON (vehicle_id)
  vehicle_id,
  device_id,
  latitude,
  longitude,
  speed,
  time AS last_seen
FROM clean_telemetry
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
ORDER BY vehicle_id, time DESC;

CREATE UNIQUE INDEX ON vehicle_latest_position (vehicle_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Harsh driving event counts per vehicle
-- Used by: GET /vehicles/:id (detail panel)
--          GET /alerts (alert list)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE MATERIALIZED VIEW vehicle_harsh_driving AS
SELECT
  vehicle_id,
  COUNT(*) FILTER (
    WHERE event_detail = 'harsh_braking'
  ) AS harsh_braking_count,
  COUNT(*) FILTER (
    WHERE event_detail = 'harsh_acceleration'
  ) AS harsh_acceleration_count,
  COUNT(*) FILTER (
    WHERE event_detail = 'harsh_cornering'
  ) AS harsh_cornering_count,
  COUNT(*) FILTER (
    WHERE event_category = 'crash_detection'
  ) AS crash_count,
  COUNT(*) AS total_harsh_events
FROM vehicle_events
WHERE time > NOW() - INTERVAL '24 hours'
GROUP BY vehicle_id;

CREATE UNIQUE INDEX ON vehicle_harsh_driving (vehicle_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Fleet KPIs
-- Used by: GET /analytics/kpis
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE MATERIALIZED VIEW fleet_kpis AS
SELECT
  COUNT(DISTINCT vlp.vehicle_id) AS total_vehicles,
  COUNT(DISTINCT vlp.vehicle_id) FILTER (
    WHERE vlp.last_seen > NOW() - INTERVAL '10 minutes'
  ) AS active_vehicles,
  COUNT(DISTINCT vlp.vehicle_id) FILTER (
    WHERE vlp.last_seen <= NOW() - INTERVAL '10 minutes'
  ) AS inactive_vehicles,
  COALESCE(SUM(vhd.total_harsh_events), 0) AS total_harsh_events_today,
  COALESCE(SUM(vhd.harsh_braking_count), 0) AS total_harsh_braking,
  COALESCE(SUM(vhd.harsh_acceleration_count), 0) AS total_harsh_acceleration,
  COALESCE(SUM(vhd.harsh_cornering_count), 0) AS total_harsh_cornering,
  COALESCE(SUM(vhd.crash_count), 0) AS total_crashes
FROM vehicle_latest_position vlp
LEFT JOIN vehicle_harsh_driving vhd
  ON vlp.vehicle_id = vhd.vehicle_id;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Refresh function — called every 5 seconds
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION refresh_gold_layer()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY vehicle_latest_position;
  REFRESH MATERIALIZED VIEW CONCURRENTLY vehicle_harsh_driving;
  REFRESH MATERIALIZED VIEW fleet_kpis;
END;
$$ LANGUAGE plpgsql;
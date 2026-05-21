const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');

const ACTIVITY_RANGES = {
  day: { bucket: '1 hour', interval: '1 day' },
  week: { bucket: '1 day', interval: '7 days' },
};

async function getFleetKPIs(req, res) {
  try {
    // Query 1 — active vs total vehicles (Gold layer, instant)
    const vehicles_result = await pool.query(`
      SELECT
        COUNT(DISTINCT vehicle_id) as total_vehicles,
        COUNT(DISTINCT vehicle_id) FILTER (
          WHERE last_seen > NOW() - INTERVAL '10 minutes'
        ) as active_vehicles
      FROM (
        SELECT DISTINCT ON (vehicle_id)
          vehicle_id, last_seen
        FROM vehicle_position_5s
        ORDER BY vehicle_id, bucket DESC
      ) latest
    `);

    // Query 2 — alerts today (vehicle_events_hourly, pre-aggregated)
    const alerts_result = await pool.query(`
      SELECT
        COALESCE(SUM(harsh_braking_count), 0) +
        COALESCE(SUM(harsh_acceleration_count), 0) +
        COALESCE(SUM(harsh_cornering_count), 0) +
        COALESCE(SUM(crash_count), 0) as alerts_today
      FROM vehicle_events_hourly
      WHERE bucket >= CURRENT_DATE
    `);

    const v = vehicles_result.rows[0];
    const a = alerts_result.rows[0];

    return success(res, {
      total_vehicles:  parseInt(v.total_vehicles)  || 0,
      active_vehicles: parseInt(v.active_vehicles) || 0,
      alerts_today:    parseInt(a.alerts_today)    || 0,
      last_updated:    new Date().toISOString()
    }, 200);

  } catch (err) {
    console.error('Get fleet KPIs error:', err);
    return error(res, 'Failed to fetch KPIs: ' + err.message, 500);
  }
}

async function getActiveAlerts(req, res) {
  const limit = Number.parseInt(req.query.limit) || 50;

  try {
    const result = await pool.query(`
      SELECT
        vehicle_id,
        event_detail as type,
        event_category,
        latitude,
        longitude,
        speed,
        time as timestamp
      FROM vehicle_events
      WHERE event_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering')
        OR event_category = 'crash_detection'
      ORDER BY time DESC
      LIMIT $1
    `, [limit]);

    const alerts = result.rows.map((alert, index) => {
      let severity = 'medium';
      if (alert.type === 'harsh_braking') {
        severity = 'high';
      } else if (alert.event_category === 'crash_detection') {
        severity = 'critical';
      }

      const alertType = alert.type || alert.event_category;

      return {
        id: index + 1,
        vehicle_id: alert.vehicle_id,
        type: alertType,
        severity: severity,
        message: `${alert.vehicle_id}: ${alertType} at ${alert.speed} km/h`,
        latitude: Number.parseFloat(alert.latitude),
        longitude: Number.parseFloat(alert.longitude),
        speed: alert.speed,
        timestamp: alert.timestamp,
      };
    });

    return success(res, { total: alerts.length, alerts }, 200);
  } catch (err) {
    const errorMessage = err.message || 'Failed to fetch alerts';
    console.error('Get active alerts error:', err);
    return error(res, 'Failed to fetch alerts: ' + errorMessage, 500);
  }
}

async function getFleetActivityHistory(req, res) {
  const range = (req.query.range || 'day').toLowerCase();
  const config = ACTIVITY_RANGES[range];

  if (!config) {
    return error(res, 'Invalid range. Use day or week.', 400);
  }

  const minSpeed = Number.parseFloat(req.query.minSpeed);
  const speedThreshold = Number.isFinite(minSpeed) ? minSpeed : 5;

  try {
    const result = await pool.query(`
      SELECT
        time_bucket($1::interval, bucket) AS bucket,
        COUNT(DISTINCT vehicle_id) FILTER (WHERE speed >= $3) AS active_vehicles
      FROM vehicle_position_5s
      WHERE bucket >= NOW() - $2::interval
      GROUP BY 1
      ORDER BY 1
    `, [config.bucket, config.interval, speedThreshold]);

    const points = result.rows.map((row) => ({
      bucket: row.bucket,
      active_vehicles: parseInt(row.active_vehicles) || 0,
    }));

    return success(res, {
      range,
      bucket: config.bucket,
      min_speed: speedThreshold,
      points,
    }, 200);
  } catch (err) {
    console.error('Get fleet activity history error:', err);
    return error(res, 'Failed to fetch activity history: ' + err.message, 500);
  }
}

module.exports = { getFleetKPIs, getActiveAlerts, getFleetActivityHistory };

const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');

async function getFleetKPIs(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(DISTINCT v.vehicle_id) as total_vehicles,
        COUNT(DISTINCT CASE
          WHEN pos.last_seen > NOW() - INTERVAL '10 minutes'
          THEN v.vehicle_id
        END) as active_vehicles,
        COUNT(CASE
          WHEN e.event_detail IN ('harsh_braking', 'harsh_acceleration')
          AND e.time > CURRENT_DATE
          THEN 1
        END) as alerts_today
      FROM vehicles v
      LEFT JOIN vehicle_position_5s pos ON v.vehicle_id = pos.vehicle_id
      LEFT JOIN vehicle_events e ON v.vehicle_id = e.vehicle_id AND e.time > CURRENT_DATE
    `);

    const row = result.rows[0];

    return success(res, {
      total_vehicles: Number.parseInt(row.total_vehicles) || 0,
      active_vehicles: Number.parseInt(row.active_vehicles) || 0,
      alerts_today: Number.parseInt(row.alerts_today) || 0,
      last_updated: new Date().toISOString(),
    }, 200);
  } catch (err) {
    const errorMessage = err.message || 'Failed to fetch KPIs';
    console.error('Get fleet KPIs error:', err);
    return error(res, 'Failed to fetch KPIs: ' + errorMessage, 500);
  }
}

async function getActiveAlerts(req, res) {
  const limit = Number.parseInt(req.query.limit) || 50;

  try {
    const result = await pool.query(`
      SELECT vehicle_id, event_detail as type, latitude, longitude, speed, time as timestamp
      FROM vehicle_events
      WHERE event_detail IN ('harsh_braking', 'harsh_acceleration')
      ORDER BY time DESC
      LIMIT $1
    `, [limit]);

    const alerts = result.rows.map((alert, index) => ({
      id: index + 1,
      vehicle_id: alert.vehicle_id,
      type: alert.type,
      severity: alert.type === 'harsh_braking' ? 'high' : 'medium',
      message: `${alert.vehicle_id}: ${alert.type} at ${alert.speed} km/h`,
      latitude: Number.parseFloat(alert.latitude),
      longitude: Number.parseFloat(alert.longitude),
      speed: alert.speed,
      timestamp: alert.timestamp,
    }));

    return success(res, { total: alerts.length, alerts }, 200);
  } catch (err) {
    const errorMessage = err.message || 'Failed to fetch alerts';
    console.error('Get active alerts error:', err);
    return error(res, 'Failed to fetch alerts: ' + errorMessage, 500);
  }
}

module.exports = { getFleetKPIs, getActiveAlerts };

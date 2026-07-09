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
        COUNT(*) as total_vehicles,
        COUNT(*) FILTER (
          WHERE last_update >= NOW() AT TIME ZONE 'UTC' - INTERVAL '1 hour'
        ) as active_vehicles
      FROM current_vehicle_position
    `);

    // Query 2 — alerts today (vehicle_events_hourly, pre-aggregated)
    const alerts_result = await pool.query(`
      SELECT
        time,
        vehicle_id,
        event_category,
        event_detail,
        speed,
        latitude,
        longitude
      FROM vehicle_events
      WHERE time >= NOW() AT TIME ZONE 'UTC' - INTERVAL '15 seconds'
      ORDER BY time DESC;
    `);

    // Query 3 — FIXED: Swapped 'day' for 'bucket' and aggregated 5-min intervals since midnight UTC
    const distance_result = await pool.query(`
      SELECT
        COALESCE(SUM(distance_km), 0) AS distance_today
      FROM vehicle_daily_distance
      WHERE bucket >= date_trunc('day', NOW() AT TIME ZONE 'UTC');
    `);

    const v = vehicles_result.rows[0];
    //const a = alerts_result.rows[0];
    const d = distance_result.rows[0];
    
    const alertsCount = alerts_result.rows.length;

    return success(res, {
      total_vehicles:  parseInt(v.total_vehicles)  || 0,
      active_vehicles: parseInt(v.active_vehicles) || 0,
      alerts_today:    alertsCount,
      distance_today:  parseFloat(d.distance_today) || 0,
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
      WHERE event_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering', 'Ignition On', 'Ignition Off')
        OR event_category IN ('crash_detection', 'ignition')
      ORDER BY time DESC
      LIMIT 1;
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
        time_bucket($1::interval, time) AS bucket,
        COUNT(DISTINCT vehicle_id) FILTER (WHERE speed >= 3) AS active_vehicles
      FROM clean_telemetry
      WHERE time >= NOW() - $2::interval 
      GROUP BY 1
      ORDER BY 1;
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

async function getTotalDistanceToday(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        -- 1. Total lifetime distance across all recorded history
        COALESCE(SUM(distance_km), 0) AS total_lifetime_distance,

        -- 2. Total distance accumulated today since midnight UTC
        COALESCE(
          SUM(distance_km) FILTER (
            WHERE bucket >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
          ),
          0
        ) AS distance_today,

        -- 3. Unique count of actual vehicles that have moved today
        COUNT(DISTINCT vehicle_id) FILTER (
          WHERE bucket >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
        ) AS vehicles_driven_today

      FROM vehicle_daily_distance;
    `);

    const data = result.rows[0];

    return success(res, {
      total_distance: Number(data.total_lifetime_distance),
      distance_today: Number(data.distance_today),
      vehicles_driven_today: Number(data.vehicles_driven_today),
      unit: 'km'
    });

  } catch (err) {
    console.error(err);
    return error(res, 'Failed to fetch fleet metrics', 500);
  }
}

module.exports = { getFleetKPIs, getActiveAlerts, getFleetActivityHistory, getTotalDistanceToday };
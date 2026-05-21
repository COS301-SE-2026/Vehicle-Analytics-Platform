const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');

async function getLiveLocations(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        v.vehicle_id as id,
        v.device_id,
        v.driver_name,
        CASE
          WHEN pos.last_seen IS NULL THEN 'offline'
          WHEN pos.last_seen < NOW() - INTERVAL '5 minutes' THEN 'offline'
          WHEN COALESCE(pos.speed, 0) > 0 THEN 'active'
          ELSE 'idle'
        END as status,
        pos.latitude,
        pos.longitude,
        pos.speed,
        pos.last_seen as last_update
      FROM vehicles v
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, speed, last_seen
        FROM vehicle_position_5s
        WHERE vehicle_id = v.vehicle_id
        ORDER BY last_seen DESC, bucket DESC
        LIMIT 1
      ) pos ON true
      ORDER BY v.vehicle_id
    `);

    return success(res, {
      timestamp: new Date().toISOString(),
      count: result.rows.length,
      vehicles: result.rows,
    }, 200);
  } catch (err) {
    const errorMessage = err.message || 'Failed to fetch vehicle locations';
    console.error('Get live locations error:', err);
    return error(res, 'Failed to fetch vehicle locations: ' + errorMessage, 500);
  }
}

async function getVehicleById(req, res) {
  const { vehicleId } = req.params;

  if (!vehicleId) {
    return error(res, 'Vehicle ID is required', 400);
  }

  try {
    const vehicleResult = await pool.query(`
      SELECT
        v.vehicle_id as id,
        v.device_id,
        v.license_plate,
        v.make,
        v.model,
        v.status,
        v.driver_name,
        v.created_at,
        pos.latitude,
        pos.longitude,
        pos.speed,
        pos.last_seen as last_update
      FROM vehicles v
      LEFT JOIN (
        SELECT DISTINCT ON (vehicle_id) *
        FROM vehicle_position_5s
        ORDER BY vehicle_id, last_seen DESC, bucket DESC
      ) pos ON v.vehicle_id = pos.vehicle_id
      WHERE v.vehicle_id = $1
    `, [vehicleId]);

    if (vehicleResult.rows.length === 0) {
      return error(res, 'Vehicle not found', 404);
    }

    const eventsResult = await pool.query(`
      SELECT
        event_detail as type,
        event_category,
        speed,
        latitude,
        longitude,
        time as timestamp
      FROM vehicle_events
      WHERE vehicle_id = $1
      ORDER BY time DESC
      LIMIT 20
    `, [vehicleId]);

    return success(res, {
      vehicle: vehicleResult.rows[0],
      recent_events: eventsResult.rows,
    }, 200);
  } catch (err) {
    const errorMessage = err.message || 'Failed to fetch vehicle details';
    console.error('Get vehicle by ID error:', err);
    return error(res, 'Failed to fetch vehicle details: ' + errorMessage, 500);
  }
}

module.exports = { getLiveLocations, getVehicleById };

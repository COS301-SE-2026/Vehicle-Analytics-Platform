const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');

async function getLiveLocations(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        v.vehicle_id as id,
        v.device_id,
        CASE
          WHEN cvp.last_update IS NULL THEN 'offline'
          WHEN cvp.last_update < NOW() - INTERVAL '5 minutes' THEN 'offline'
          WHEN cvp.speed > 5 THEN 'active'
          ELSE 'idle'
        END as status,
        cvp.latitude,
        cvp.longitude,
        cvp.speed,
        cvp.last_update
      FROM vehicles v
      LEFT JOIN current_vehicle_position cvp ON v.vehicle_id = cvp.id
      ORDER BY v.vehicle_id
    `);

    return success(res, {
      timestamp: new Date().toISOString(),
      count: result.rows.length,
      vehicles: result.rows,
    }, 200);
  } catch (err) {
    //const errorMessage = err.message || 'Failed to fetch vehicle locations';
    console.error('Get live locations error:', err);
    return error(res, `Database Crash Detail: ${err.message}. Code: ${err.code || 'None'}. Stack: ${err.stack}`, 500);
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
        v.status,
        v.created_at,
        cvp.latitude,
        cvp.longitude,
        cvp.speed,
        cvp.last_update
      FROM vehicles v
      LEFT JOIN current_vehicle_position cvp ON v.vehicle_id = cvp.id
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
    //const errorMessage = err.message || 'Failed to fetch vehicle details';
    console.error('Get vehicle by ID error:', err);
    return error(res, `Database Crash Detail: ${err.message}. Code: ${err.code || 'None'}. Stack: ${err.stack}`, 500);  }
}

module.exports = { getLiveLocations, getVehicleById };

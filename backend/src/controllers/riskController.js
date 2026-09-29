const RiskPredictionService = require('../services/riskPredictionService');
const { success, error } = require('../utils/response');
const { pool } = require('../db/pool');

function getService() {
  return new RiskPredictionService();
}

// Normalise req.fleetGroupIds:
//   null/undefined  → null (unrestricted)
//   [1,2]           → [1,2] (scoped)
//   [undefined]     → null (treat as unrestricted — test mocks sometimes do this)
function scoped(req) {
  const g = req.fleetGroupIds;
  if (g == null) return null;
  if (!Array.isArray(g)) return null;
  const cleaned = g.filter((x) => x != null);
  return cleaned.length ? cleaned : null;
}

exports.getVehicleRisk = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const days = Number.parseInt(req.query.days, 10) || 30;
    const data = await getService().getVehicleRisk(vehicleId, days, scoped(req));
    if (!data) return error(res, 'No prediction available for this vehicle', 404);
    return success(res, data, 200);
  } catch (err) {
    console.error('getVehicleRisk error:', err);
    return error(res, 'Failed to fetch vehicle risk', 500);
  }
};

exports.getFleetRisk = async (req, res) => {
  try {
    const data = await getService().getFleetRisk(scoped(req));
    return success(res, { vehicles: data }, 200);
  } catch (err) {
    console.error('getFleetRisk error:', err);
    return error(res, 'Failed to fetch fleet risk', 500);
  }
};

exports.getCoachingHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const data = await getService().getCoachingHistory(vehicleId, scoped(req));
    return success(res, data, 200);
  } catch (err) {
    console.error('getCoachingHistory error:', err);
    return error(res, 'Failed to fetch coaching history', 500);
  }
};

exports.getRiskNotifications = async (req, res) => {
  try {
    const since =
      req.query.since ||
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { rows } = await pool.query(
      `
      SELECT n.id, n.vehicle_id, n.notification_type, n.message,
             n.risk_tier, n.created_at
      FROM risk_notification_log n
      JOIN vehicles v ON v.vehicle_id = n.vehicle_id
      WHERE n.created_at > $1
        AND ($2::bigint[] IS NULL OR v.fleet_group_id = ANY($2::bigint[]))
      ORDER BY n.created_at DESC
      LIMIT 100
      `,
      [since, scoped(req)]
    );

    return success(
      res,
      { notifications: rows, checked_at: new Date().toISOString() },
      200
    );
  } catch (err) {
    console.error('getRiskNotifications error:', err);
    return error(res, 'Failed to fetch risk notifications', 500);
  }
};

exports.getSimilarVehicles = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const k = Number.parseInt(req.query.k, 10) || 5;
    const data = await getService().getSimilarVehicles(vehicleId, k, scoped(req));
    return success(res, { vehicle_id: vehicleId, similar: data }, 200);
  } catch (err) {
    console.error('getSimilarVehicles error:', err);
    return error(res, 'Failed to fetch similar vehicles', 500);
  }
};

exports.runPrediction = async (req, res) => {
  try {
    const result = await getService().predictAll();
    return success(res, { message: 'Risk predictions updated', ...result }, 200);
  } catch (err) {
    console.error('runPrediction error:', err);
    return error(res, err.message, 500);
  }
};




const RiskPredictionService = require('../services/riskPredictionService');
const { success, error } = require('../utils/response');



function getService() {
  return new RiskPredictionService();
}

exports.getVehicleRisk = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const days = Number.parseInt(req.query.days, 10) || 30;
    const data = await getService().getVehicleRisk(vehicleId, days);
    if (!data) return error(res, 'No prediction available for this vehicle', 404);
    return success(res, data, 200);
  } catch (err) {
    console.error('getVehicleRisk error:', err);
    return error(res, 'Failed to fetch vehicle risk', 500);
  }
};

exports.getFleetRisk = async (req, res) => {
  try {
    const data = await getService().getFleetRisk();
    return success(res, { vehicles: data }, 200);
  } catch (err) {
    console.error('getFleetRisk error:', err);
    return error(res, 'Failed to fetch fleet risk', 500);
  }
};

exports.getCoachingHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const data = await getService().getCoachingHistory(vehicleId);
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

    const { pool } = require('../db/pool');
    const { rows } = await pool.query(
      `
      SELECT id, vehicle_id, notification_type, message, risk_tier, created_at
      FROM risk_notification_log
      WHERE created_at > $1
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [since]
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
    const data = await getService().getSimilarVehicles(vehicleId, k);
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

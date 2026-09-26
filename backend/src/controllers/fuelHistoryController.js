const FuelHistoryService = require("../services/fuelHistoryService");
const { success, error } = require("../utils/response");

const fuelHistoryService = new FuelHistoryService();

const ALLOWED_PERIODS = ["day", "week", "month", "year"];

// Helper to sanitize fleet group array passed down from auth middleware
const getFleetGroupParam = (fleetGroupIds) => {
  return Array.isArray(fleetGroupIds) && fleetGroupIds.length > 0
    ? fleetGroupIds
    : null;
};

exports.getVehicleFuelHistory = async (req, res) => {
  const { vehicleId } = req.params;
  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

  if (!vehicleId || !vehicleId.trim()) {
    return error(res, "Vehicle ID is required", 400);
  }

  const period =
    typeof req.query.period === "string" &&
    ALLOWED_PERIODS.includes(req.query.period.toLowerCase())
      ? req.query.period.toLowerCase()
      : "week";

  let limit = Number.parseInt(req.query.limit, 10);
  limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 10;

  try {
    const data = await fuelHistoryService.getVehicleFuelHistory(
      vehicleId.trim(),
      period,
      limit,
      fleetGroupIds
    );

    return success(res, data, 200);
  } catch (err) {
    console.error("Error in getVehicleFuelHistory:", err);
    return error(
      res,
      "An internal error occurred while fetching vehicle fuel history",
      500
    );
  }
};

exports.getFleetFuelHistory = async (req, res) => {
  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

  const period =
    typeof req.query.period === "string" &&
    ALLOWED_PERIODS.includes(req.query.period.toLowerCase())
      ? req.query.period.toLowerCase()
      : "week";

  let limit = Number.parseInt(req.query.limit, 10);
  limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 10;

  try {
    const data = await fuelHistoryService.getFleetFuelHistory(
      period,
      limit,
      fleetGroupIds
    );

    return success(res, data, 200);
  } catch (err) {
    console.error("Error in getFleetFuelHistory:", err);
    return error(
      res,
      "An internal error occurred while fetching fleet fuel history",
      500
    );
  }
};

exports.getVehicleFuelTrend = async (req, res) => {
  const { vehicleId } = req.params;
  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

  if (!vehicleId || !vehicleId.trim()) {
    return error(res, "Vehicle ID is required", 400);
  }

  let days = Number.parseInt(req.query.days, 10);
  days = Number.isInteger(days) && days > 0 ? Math.min(days, 365) : 30;

  try {
    const data = await fuelHistoryService.getVehicleFuelTrend(
      vehicleId.trim(),
      days,
      fleetGroupIds
    );

    return success(res, data, 200);
  } catch (err) {
    console.error("Error in getVehicleFuelTrend:", err);
    return error(
      res,
      "An internal error occurred while fetching vehicle fuel trend",
      500
    );
  }
};

exports.calculateDailyHistory = async (req, res) => {
  const { vehicleId } = req.params;
  const { date } = req.query;
  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

  if (!vehicleId || !vehicleId.trim()) {
    return error(res, "Vehicle ID is required", 400);
  }

  let targetDate = new Date();
  if (date) {
    targetDate = new Date(date);
    if (Number.isNaN(targetDate.getTime())) {
      return error(res, "Invalid date format. Use YYYY-MM-DD", 400);
    }
  }

  try {
    await fuelHistoryService.calculateAndStoreDailyHistory(
      vehicleId.trim(),
      targetDate,
      fleetGroupIds
    );

    return success(
      res,
      { message: "Daily fuel history calculated successfully" },
      200
    );
  } catch (err) {
    console.error("Error in calculateDailyHistory:", err);
    return error(
      res,
      "An internal error occurred while calculating daily fuel history",
      500
    );
  }
};
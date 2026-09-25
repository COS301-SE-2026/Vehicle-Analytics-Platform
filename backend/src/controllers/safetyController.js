const { pool } = require("../db/pool");
const { success, error } = require("../utils/response");

// Helper to sanitize fleet group array passed down from auth middleware
const getFleetGroupParam = (fleetGroupIds) => {
  return Array.isArray(fleetGroupIds) && fleetGroupIds.length > 0
    ? fleetGroupIds
    : null;
};

// Helper to validate provided query date parameters
const isValidDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return false;
  const d = new Date(dateStr);
  return !Number.isNaN(d.getTime());
};

function getClassification(score) {
  if (score === null || score === undefined) return "No Data";
  const numericScore = Number.parseInt(score, 10);
  if (Number.isNaN(numericScore)) return "No Data";

  if (numericScore >= 80) return "Good";
  if (numericScore >= 50) return "Fair";
  return "Poor";
}

async function getVehicleSafetyScore(req, res) {
  const { vehicleId } = req.params;
  const { date, start_date, end_date } = req.query;

  if (!vehicleId) {
    return error(res, "Vehicle ID is required", 400);
  }

  if (start_date && !isValidDate(start_date)) {
    return error(res, "Invalid 'start_date' parameter format", 400);
  }
  if (end_date && !isValidDate(end_date)) {
    return error(res, "Invalid 'end_date' parameter format", 400);
  }
  if (date && !isValidDate(date)) {
    return error(res, "Invalid 'date' parameter format", 400);
  }

  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

  try {
    const accessCheck = await pool.query(
      `
      SELECT 1 FROM vehicles
      WHERE vehicle_id = $1
        AND ($2::bigint[] IS NULL OR fleet_group_id = ANY($2::bigint[]))
      `,
      [vehicleId, fleetGroupIds]
    );

    if (accessCheck.rows.length === 0) {
      return error(res, "Vehicle not found or access denied", 404);
    }

    let query = `
      SELECT 
        vehicle_id,
        score_date,
        safety_score,
        harsh_brakes,
        harsh_accelerations,
        harsh_cornering,
        crashes,
        total_events,
        classification
      FROM driver_daily_safety_scores
      WHERE vehicle_id = $1
    `;

    const params = [vehicleId];
    let paramCount = 2;

    if (start_date && end_date) {
      query += ` AND score_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(start_date, end_date);
      paramCount += 2;
    } else if (date) {
      query += ` AND score_date = $${paramCount}`;
      params.push(date);
      paramCount++;
    } else {
      query += ` AND score_date = CURRENT_DATE`;
    }

    query += ` ORDER BY score_date DESC`;

    const result = await pool.query(query, params);

    if (!result.rows || result.rows.length === 0) {
      return success(
        res,
        {
          vehicle_id: vehicleId,
          date: date || "CURRENT_DATE",
          message: "No safety data available for this date",
          safety_score: null,
          classification: "No Data",
          scores: [],
        },
        200
      );
    }

    const scores = result.rows.map((r) => {
      const parsedScore =
        r.safety_score !== null && r.safety_score !== undefined
          ? Number.parseInt(r.safety_score, 10)
          : null;

      return {
        date: r.score_date,
        safety_score: parsedScore,
        harsh_brakes: Number.parseInt(r.harsh_brakes, 10) || 0,
        harsh_accelerations: Number.parseInt(r.harsh_accelerations, 10) || 0,
        harsh_cornering: Number.parseInt(r.harsh_cornering, 10) || 0,
        crashes: Number.parseInt(r.crashes, 10) || 0,
        total_events: Number.parseInt(r.total_events, 10) || 0,
        classification: r.classification || getClassification(parsedScore),
      };
    });

    const latest = scores[0];

    return success(
      res,
      {
        vehicle_id: vehicleId,
        date: latest.date,
        safety_score: latest.safety_score,
        harsh_brakes: latest.harsh_brakes,
        harsh_accelerations: latest.harsh_accelerations,
        harsh_cornering: latest.harsh_cornering,
        crashes: latest.crashes,
        total_events: latest.total_events,
        classification: latest.classification,
        scores,
        total_days: scores.length,
      },
      200
    );
  } catch (err) {
    console.error("Get safety score error:", err);
    return error(
      res,
      "An internal error occurred while fetching vehicle safety score",
      500
    );
  }
}

async function getFleetSafetyScores(req, res) {
  const { date, start_date, end_date } = req.query;

  if (start_date && !isValidDate(start_date)) {
    return error(res, "Invalid 'start_date' parameter format", 400);
  }
  if (end_date && !isValidDate(end_date)) {
    return error(res, "Invalid 'end_date' parameter format", 400);
  }
  if (date && !isValidDate(date)) {
    return error(res, "Invalid 'date' parameter format", 400);
  }

  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

  try {
    let query = `
      SELECT 
        dss.vehicle_id,
        dss.score_date,
        dss.safety_score,
        dss.harsh_brakes,
        dss.harsh_accelerations,
        dss.harsh_cornering,
        dss.crashes,
        dss.total_events,
        dss.classification
      FROM driver_daily_safety_scores dss
      JOIN vehicles v ON v.vehicle_id = dss.vehicle_id
      WHERE ($1::bigint[] IS NULL OR v.fleet_group_id = ANY($1::bigint[]))
    `;

    const params = [fleetGroupIds];
    let paramCount = 2;

    if (start_date && end_date) {
      query += ` AND dss.score_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(start_date, end_date);
      paramCount += 2;
    } else if (date) {
      query += ` AND dss.score_date = $${paramCount}`;
      params.push(date);
      paramCount++;
    } else {
      query += ` AND dss.score_date = (SELECT MAX(score_date) FROM driver_daily_safety_scores)`;
    }

    query += ` ORDER BY dss.safety_score ASC NULLS LAST`;

    const result = await pool.query(query, params);

    if (!result.rows || result.rows.length === 0) {
      return success(
        res,
        {
          date: date || "latest",
          total_vehicles: 0,
          vehicles: [],
        },
        200
      );
    }

    const vehicles = result.rows.map((row) => {
      const parsedScore =
        row.safety_score !== null && row.safety_score !== undefined
          ? Number.parseInt(row.safety_score, 10)
          : null;

      return {
        vehicle_id: row.vehicle_id,
        date: row.score_date,
        safety_score: parsedScore,
        harsh_brakes: Number.parseInt(row.harsh_brakes, 10) || 0,
        harsh_accelerations: Number.parseInt(row.harsh_accelerations, 10) || 0,
        harsh_cornering: Number.parseInt(row.harsh_cornering, 10) || 0,
        crashes: Number.parseInt(row.crashes, 10) || 0,
        total_events: Number.parseInt(row.total_events, 10) || 0,
        classification: row.classification || getClassification(parsedScore),
      };
    });

    return success(
      res,
      {
        date: date || "latest",
        total_vehicles: vehicles.length,
        vehicles,
      },
      200
    );
  } catch (err) {
    console.error("Get fleet safety scores error:", err);
    return error(
      res,
      "An internal error occurred while fetching fleet safety scores",
      500
    );
  }
}

module.exports = {
  getVehicleSafetyScore,
  getFleetSafetyScores,
  getClassification,
};
const { pool } = require("../db/pool");
const { success, error } = require("../utils/response");

// Helper to sanitize fleet group array passed down from auth middleware
const getFleetGroupParam = (fleetGroupIds) => {
  return Array.isArray(fleetGroupIds) && fleetGroupIds.length > 0
    ? fleetGroupIds
    : null;
};

const PERIOD_INTERVALS = {
  day: "1 day",
  week: "7 days",
  month: "30 days",
};

async function getFleetAnalytics(req, res) {
  const period =
    typeof req.query.period === "string" ? req.query.period.toLowerCase() : "day";
  const interval = PERIOD_INTERVALS[period] || PERIOD_INTERVALS.day;
  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

  try {
    const trendResult = await pool.query(
      `
      SELECT 
        d.score_date, 
        AVG(d.safety_score) AS avg_score, 
        COUNT(*) AS vehicle_count
      FROM driver_daily_safety_scores d
      JOIN vehicles v ON v.vehicle_id = d.vehicle_id
      WHERE d.score_date >= CURRENT_DATE - $1::interval
        AND ($2::bigint[] IS NULL OR v.fleet_group_id = ANY($2::bigint[]))
      GROUP BY d.score_date 
      ORDER BY d.score_date ASC
      `,
      [interval, fleetGroupIds]
    );

    const rankedResult = await pool.query(
      `
      SELECT 
        d.vehicle_id, 
        AVG(d.safety_score) AS avg_score, 
        SUM(d.harsh_brakes) AS harsh_brakes,
        SUM(d.harsh_accelerations) AS harsh_accelerations, 
        SUM(d.harsh_cornering) AS harsh_cornering, 
        SUM(d.crashes) AS crashes,
        COUNT(*) AS days_count 
      FROM driver_daily_safety_scores d
      JOIN vehicles v ON v.vehicle_id = d.vehicle_id
      WHERE d.score_date >= CURRENT_DATE - $1::interval
        AND ($2::bigint[] IS NULL OR v.fleet_group_id = ANY($2::bigint[]))
      GROUP BY d.vehicle_id 
      ORDER BY avg_score ASC
      `,
      [interval, fleetGroupIds]
    );

    const eventBreakdownResult = await pool.query(
      `
      SELECT 
        ve.event_detail, 
        COUNT(*) AS event_count 
      FROM vehicle_events ve
      JOIN vehicles v ON v.vehicle_id = ve.vehicle_id
      WHERE ve.time >= CURRENT_DATE - $1::interval
        AND ve.event_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering', 'speeding')
        AND ($2::bigint[] IS NULL OR v.fleet_group_id = ANY($2::bigint[]))
      GROUP BY ve.event_detail
      ORDER BY event_count DESC
      `,
      [interval, fleetGroupIds]
    );

    const contributionResult = await pool.query(
      `
      SELECT 
        ve.vehicle_id, 
        COUNT(*) AS total_events, 
        COUNT(*) FILTER (WHERE ve.event_detail = 'harsh_braking') AS harsh_brakes,         
        COUNT(*) FILTER (WHERE ve.event_detail = 'harsh_acceleration') AS harsh_accelerations, 
        COUNT(*) FILTER (WHERE ve.event_detail = 'harsh_cornering') AS harsh_cornering
      FROM vehicle_events ve
      JOIN vehicles v ON v.vehicle_id = ve.vehicle_id
      WHERE ve.time >= CURRENT_DATE - $1::interval 
        AND ve.event_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering', 'speeding')
        AND ($2::bigint[] IS NULL OR v.fleet_group_id = ANY($2::bigint[]))
      GROUP BY ve.vehicle_id 
      ORDER BY total_events DESC
      `,
      [interval, fleetGroupIds]
    );

    return success(
      res,
      {
        period: PERIOD_INTERVALS[period] ? period : "day",
        trend: trendResult.rows.map((row) => ({
          date: row.score_date,
          avg_score: Number.parseFloat(row.avg_score) || 0,
          vehicle_count: Number.parseInt(row.vehicle_count, 10) || 0,
        })),
        ranked_vehicles: rankedResult.rows.map((row) => ({
          vehicle_id: row.vehicle_id,
          avg_score: Number.parseFloat(row.avg_score) || 0,
          harsh_brakes: Number.parseInt(row.harsh_brakes, 10) || 0,
          harsh_accelerations: Number.parseInt(row.harsh_accelerations, 10) || 0,
          harsh_cornering: Number.parseInt(row.harsh_cornering, 10) || 0,
          crashes: Number.parseInt(row.crashes, 10) || 0,
          days_count: Number.parseInt(row.days_count, 10) || 0,
        })),
        event_breakdown: eventBreakdownResult.rows.map((row) => ({
          type: row.event_detail,
          count: Number.parseInt(row.event_count, 10) || 0,
        })),
        vehicle_contributions: contributionResult.rows.map((row) => ({
          vehicle_id: row.vehicle_id,
          total_events: Number.parseInt(row.total_events, 10) || 0,
          harsh_brakes: Number.parseInt(row.harsh_brakes, 10) || 0,
          harsh_accelerations: Number.parseInt(row.harsh_accelerations, 10) || 0,
          harsh_cornering: Number.parseInt(row.harsh_cornering, 10) || 0,
        })),
      },
      200
    );
  } catch (err) {
    console.error("Get fleet analytics error:", err);
    return error(res, "An internal error occurred while fetching fleet analytics", 500);
  }
}

async function getVehicleDailyScores(req, res) {
  const { vehicleId } = req.params;
  let days = Number.parseInt(req.query.days, 10);
  days = Number.isInteger(days) && days > 0 ? Math.min(days, 90) : 7;

  if (!vehicleId) {
    return error(res, "Vehicle ID is required", 400);
  }

  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

  try {
    const result = await pool.query(
      `
      SELECT 
        d.score_date, 
        d.safety_score, 
        d.harsh_brakes, 
        d.harsh_accelerations,
        d.harsh_cornering, 
        d.crashes, 
        d.total_events, 
        d.classification
      FROM driver_daily_safety_scores d
      JOIN vehicles v ON v.vehicle_id = d.vehicle_id
      WHERE d.vehicle_id = $1 
        AND d.score_date >= CURRENT_DATE - ($2 * INTERVAL '1 day')
        AND ($3::bigint[] IS NULL OR v.fleet_group_id = ANY($3::bigint[]))
      ORDER BY d.score_date DESC
      `,
      [vehicleId, days, fleetGroupIds]
    );

    return success(
      res,
      {
        vehicle_id: vehicleId,
        days,
        scores: result.rows.map((row) => ({
          date: row.score_date,
          safety_score: Number.parseInt(row.safety_score, 10) || 0,
          harsh_brakes: Number.parseInt(row.harsh_brakes, 10) || 0,
          harsh_accelerations: Number.parseInt(row.harsh_accelerations, 10) || 0,
          harsh_cornering: Number.parseInt(row.harsh_cornering, 10) || 0,
          crashes: Number.parseInt(row.crashes, 10) || 0,
          total_events: Number.parseInt(row.total_events, 10) || 0,
          classification: row.classification || "Good",
        })),
      },
      200
    );
  } catch (err) {
    console.error("Get vehicle daily scores error:", err);
    return error(res, "An internal error occurred while fetching vehicle scores", 500);
  }
}

module.exports = { getFleetAnalytics, getVehicleDailyScores };
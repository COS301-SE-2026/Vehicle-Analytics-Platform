const { pool } = require("../db/pool");
const { success, error } = require("../utils/response");

const ACTIVITY_RANGES = {
  day: { bucket: "1 hour", interval: "1 day" },
  week: { bucket: "1 day", interval: "7 days" },
};

// Helper to sanitize fleet group array passed down from auth middleware
const getFleetGroupParam = (fleetGroupIds) => {
  return Array.isArray(fleetGroupIds) && fleetGroupIds.length > 0 ? fleetGroupIds : null;
};

async function getFleetKPIs(req, res) {
  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

  try {
    const vehicles_result = await pool.query(
      `
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(*) FILTER (
          WHERE last_update >= data_now() - INTERVAL '1 hour'
        ) as active_vehicles
      FROM current_vehicle_position cvp
      JOIN vehicles v ON v.vehicle_id = cvp.vehicle_id
      WHERE ($1::bigint[] IS NULL OR v.fleet_group_id = ANY($1::bigint[]))
      `,
      [fleetGroupIds],
    );

    const alerts_result = await pool.query(
      `
      SELECT COUNT(*) AS alert_count
      FROM vehicle_events ve
      JOIN vehicles v ON v.vehicle_id = ve.vehicle_id
      WHERE ve.time >= data_today()
        AND event_category IN ('green_driving_type', 'crash_detection')
        AND ($1::bigint[] IS NULL OR v.fleet_group_id = ANY($1::bigint[]))
      `,
      [fleetGroupIds],
    );

    const distance_result = await pool.query(
      `
      SELECT
        COALESCE(SUM(distance_km), 0) AS distance_today
      FROM vehicle_daily_distance vdd
      JOIN vehicles v ON v.vehicle_id = vdd.vehicle_id
      WHERE day >= data_today() AND ($1::bigint[] IS NULL OR v.fleet_group_id = ANY($1::bigint[]))
      `,
      [fleetGroupIds],
    );

    const v = vehicles_result.rows[0];
    const d = distance_result.rows[0];

    return success(
      res,
      {
        total_vehicles: Number.parseInt(v.total_vehicles, 10) || 0,
        active_vehicles: Number.parseInt(v.active_vehicles, 10) || 0,
        alerts_today: Number.parseInt(alerts_result.rows[0].alert_count, 10) || 0,
        distance_today: Number.parseFloat(d.distance_today) || 0,
        last_updated: new Date().toISOString(),
      },
      200,
    );
  } catch (err) {
    // Security Fix: Prevent Information Leakage
    console.error("Get fleet KPIs error:", err);
    return error(res, "An internal error occurred while fetching KPIs", 500);
  }
}

async function getActiveAlerts(req, res) {
  // Security Fix: Bound and sanitize input limit to prevent Denial of Service (DoS)
  let limit = Number.parseInt(req.query.limit, 10);
  limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 50;

  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

  try {
    const result = await pool.query(
      `
      SELECT
        ve.vehicle_id,
        ve.event_detail as type,
        ve.event_category,
        ve.latitude,
        ve.longitude,
        ve.speed,
        ve.time as timestamp,
        vlc.display_name
      FROM vehicle_events ve
      LEFT JOIN vehicle_location_cache vlc ON vlc.vehicle_id = ve.vehicle_id
      JOIN vehicles v ON v.vehicle_id = ve.vehicle_id
      WHERE ve.event_category IN (
              'green_driving_type', 'crash_detection',
              'towing', 'unplug', 'immobilizer'
            )
        AND ($2::bigint[] IS NULL OR v.fleet_group_id = ANY($2::bigint[]))
      ORDER BY ve.time DESC
      LIMIT $1
      `,
      [limit, fleetGroupIds],
    );

    const alerts = result.rows.map((alert, index) => {
      const detail = (alert.type || "").toLowerCase();
      const category = alert.event_category;
      let eventType = category || "unknown";
      let severity = "LOW";
      let description = alert.type || "Event recorded";

      if (category === "crash_detection") {
        eventType = "crash";
        severity = "HIGH";
        description = alert.type || "Impact detected";
      } else if (detail.includes("harsh_braking")) {
        eventType = "harsh_braking";
        severity = "MEDIUM";
        description = "Harsh braking detected";
      } else if (detail.includes("harsh_acceleration")) {
        eventType = "harsh_acceleration";
        severity = "MEDIUM";
        description = "Harsh acceleration detected";
      } else if (detail.includes("harsh_cornering")) {
        eventType = "harsh_cornering";
        severity = "MEDIUM";
        description = "Harsh cornering detected";
      } else if (
        category === "towing" ||
        category === "unplug" ||
        category === "immobilizer"
      ) {
        eventType = category;
        severity = "HIGH";
        description =
          category === "towing"
            ? "Vehicle being towed"
            : category === "unplug"
              ? "Tracking device unplugged"
              : "Immobilizer activated";
      }

      const hasCoords = alert.latitude != null && alert.longitude != null;
      return {
        id: `${alert.vehicle_id}-${new Date(alert.timestamp).getTime()}-${index}`,
        vehicleId: alert.vehicle_id,
        eventType,
        description,
        location:
          alert.display_name ||
          (hasCoords
            ? `${Number(alert.latitude).toFixed(4)}, ${Number(alert.longitude).toFixed(4)}`
            : "Unknown location"),
        severity,
        timestamp: alert.timestamp,
      };
    });

    return success(res, { total: alerts.length, alerts }, 200);
  } catch (err) {
    console.error("Get active alerts error:", err);
    return error(res, "An internal error occurred while fetching active alerts", 500);
  }
}

async function getFleetActivityHistory(req, res) {
  const range = typeof req.query.range === "string" ? req.query.range.toLowerCase() : "day";
  const config = ACTIVITY_RANGES[range];

  if (!config) {
    return error(res, "Invalid range. Use day or week.", 400);
  }

  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

  try {
    const result = await pool.query(
      `
      SELECT
        time_bucket($1::interval, time) AS bucket,
        COUNT(DISTINCT ct.vehicle_id) FILTER (WHERE ct.speed >= 3) AS active_vehicles
      FROM clean_telemetry ct
      JOIN vehicles v ON v.vehicle_id = ct.vehicle_id
      WHERE ct.time >= data_now() - $2::interval 
      AND ($3::bigint[] IS NULL OR v.fleet_group_id = ANY($3::bigint[]))
      GROUP BY 1
      ORDER BY 1;
      `,
      [config.bucket, config.interval, fleetGroupIds],
    );

    const points = result.rows.map((row) => ({
      time: (() => {
        const d = new Date(row.bucket);
        return range === "week"
          ? d.toLocaleDateString("en-US", { weekday: "short" })
          : d.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            });
      })(),
      vehicles: Number.parseInt(row.active_vehicles, 10) || 0,
    }));

    return success(
      res,
      {
        range,
        bucket: config.bucket,
        points,
      },
      200,
    );
  } catch (err) {
    console.error("Get fleet activity history error:", err);
    return error(res, "An internal error occurred while fetching activity history", 500);
  }
}

async function getTotalDistanceToday(req, res) {
  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

  try {
    const result = await pool.query(
      `
      SELECT
        COALESCE(SUM(vdd.distance_km), 0) AS total_lifetime_distance,
        COALESCE(
          SUM(vdd.distance_km) FILTER (WHERE vdd.day >= data_today()),
          0
        ) AS distance_today,
        COUNT(DISTINCT vdd.vehicle_id) FILTER (WHERE vdd.day >= data_today()) AS vehicles_driven_today
      FROM vehicle_daily_distance vdd
      JOIN vehicles v ON v.vehicle_id = vdd.vehicle_id
      WHERE ($1::bigint[] IS NULL OR v.fleet_group_id = ANY($1::bigint[]));
      `,
      [fleetGroupIds],
    );

    const data = result.rows[0];

    return success(res, {
      total_distance: Number(data.total_lifetime_distance),
      distance_today: Number(data.distance_today),
      vehicles_driven_today: Number(data.vehicles_driven_today),
      unit: "km",
    });
  } catch (err) {
    console.error("Get total distance error:", err);
    return error(res, "An internal error occurred while fetching distance metrics", 500);
  }
}

async function getFleetStats(req, res) {
  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

  try {
    const result = await pool.query(
      `
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(*) FILTER (WHERE status = 'active') as active_vehicles,
        COUNT(*) FILTER (WHERE status = 'idle') as idle_vehicles,
        COUNT(*) FILTER (WHERE status = 'offline') as offline_vehicles,
        COUNT(*) FILTER (WHERE has_alert) as alerts
      FROM (
        SELECT 
          v.vehicle_id,
          CASE
            WHEN pos.last_update IS NULL THEN 'offline'
            WHEN pos.last_update < data_now() - INTERVAL '5 minutes' THEN 'offline'
            WHEN COALESCE(pos.speed, 0) > 0 THEN 'active'
            ELSE 'idle'
          END as status,
          CASE 
            WHEN ve.vehicle_id IS NOT NULL THEN true 
            ELSE false 
          END as has_alert
        FROM vehicles v
        LEFT JOIN current_vehicle_position pos ON pos.vehicle_id = v.vehicle_id
        LEFT JOIN (
          SELECT DISTINCT vehicle_id 
          FROM vehicle_events 
          WHERE time > data_now() - INTERVAL '1 hour'
            AND event_category IN ('green_driving_type', 'crash_detection')
        ) ve ON v.vehicle_id = ve.vehicle_id
        WHERE ($1::bigint[] IS NULL OR v.fleet_group_id = ANY($1::bigint[]))
      ) stats
      `,
      [fleetGroupIds],
    );

    const distanceResult = await pool.query(
      `  
      SELECT COALESCE(SUM(vdd.distance_km), 0) as total_distance
      FROM vehicle_daily_distance vdd
      JOIN vehicles v ON v.vehicle_id = vdd.vehicle_id
      WHERE vdd.day = data_today() AND ($1::bigint[] IS NULL OR v.fleet_group_id = ANY($1::bigint[]))
      `,
      [fleetGroupIds],
    );

    const userResult = await pool.query(`
      SELECT COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admins,
        COUNT(*) FILTER (WHERE role = 'fleet_manager') as managers,
        COUNT(*) FILTER (WHERE role = 'viewer') as viewers
      FROM users
      WHERE is_active = true
    `);

    const users = userResult.rows[0];

    return success(
      res,
      {
        total_vehicles: Number.parseInt(result.rows[0].total_vehicles, 10) || 0,
        active_vehicles: Number.parseInt(result.rows[0].active_vehicles, 10) || 0,
        idle_vehicles: Number.parseInt(result.rows[0].idle_vehicles, 10) || 0,
        offline_vehicles: Number.parseInt(result.rows[0].offline_vehicles, 10) || 0,
        alerts: Number.parseInt(result.rows[0].alerts, 10) || 0,
        total_distance_today: Number.parseFloat(distanceResult.rows[0].total_distance) || 0,
        users: {
          total: Number.parseInt(users.total_users, 10) || 0,
          admins: Number.parseInt(users.admins, 10) || 0,
          managers: Number.parseInt(users.managers, 10) || 0,
          viewers: Number.parseInt(users.viewers, 10) || 0,
        },
        last_updated: new Date().toISOString(),
      },
      200,
    );
  } catch (err) {
    console.error("Get fleet stats error:", err);
    return error(res, "An internal error occurred while fetching fleet stats", 500);
  }
}

module.exports = {
  getFleetKPIs,
  getActiveAlerts,
  getFleetActivityHistory,
  getTotalDistanceToday,
  getFleetStats,
};
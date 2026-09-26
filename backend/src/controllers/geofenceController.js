const { pool } = require("../db/pool");
const { success, error } = require("../utils/response");

// Helper to sanitize fleet group array passed down from auth middleware
const getFleetGroupParam = (fleetGroupIds) => {
  return Array.isArray(fleetGroupIds) && fleetGroupIds.length > 0
    ? fleetGroupIds
    : null;
};

const ALLOWED_TRIGGERS = ["entry", "exit", "both"];

async function createGeofence(req, res) {
  const { name, vehicle_id, boundary, trigger_type = "both" } = req.body;

  if (!name || !name.trim() || !boundary) {
    return error(res, "Name and boundary data are required", 400);
  }

  const normalizedTrigger =
    typeof trigger_type === "string" ? trigger_type.toLowerCase() : "both";
  if (!ALLOWED_TRIGGERS.includes(normalizedTrigger)) {
    return error(res, "trigger_type must be one of: entry, exit, or both", 400);
  }

  try {
    const geojsonStr =
      typeof boundary === "string" ? boundary : JSON.stringify(boundary);

    const result = await pool.query(
      `
      INSERT INTO geofences (name, vehicle_id, boundary, trigger_type)
      VALUES ($1, $2, ST_GeomFromGeoJSON($3)::geometry(Polygon,4326), $4)
      RETURNING id, name, vehicle_id, ST_AsGeoJSON(boundary)::json AS boundary, trigger_type, created_at, updated_at
      `,
      [name.trim(), vehicle_id || null, geojsonStr, normalizedTrigger]
    );

    return success(
      res,
      {
        message: "Geofence created successfully",
        geofence: result.rows[0],
      },
      201
    );
  } catch (err) {
    console.error("Create geofence error:", err);
    return error(res, "An internal error occurred while creating geofence", 500);
  }
}

async function getGeofences(req, res) {
  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);
  const { source } = req.query;

  try {
    const params = [];
    const conditions = [];

    if (source) {
      params.push(source);
      conditions.push(`g.source = $${params.length}`);
    }

    if (fleetGroupIds) {
      params.push(fleetGroupIds);
      conditions.push(
        `(g.vehicle_id IS NULL OR v.fleet_group_id = ANY($${params.length}::bigint[]))`
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `
      SELECT
        g.id,
        g.name,
        g.vehicle_id,
        g.trigger_type,
        g.source,
        g.hotspot_kind,
        g.created_at,
        g.updated_at
      FROM geofences g
      LEFT JOIN vehicles v ON v.vehicle_id = g.vehicle_id
      ${whereClause}
      ORDER BY g.created_at DESC
      LIMIT 500
      `,
      params
    );

    return success(
      res,
      {
        total: result.rows.length,
        geofences: result.rows,
      },
      200
    );
  } catch (err) {
    console.error("Get geofences error:", err);
    return error(
      res,
      "An internal error occurred while fetching geofences",
      500
    );
  }
}

async function getGeofencesGeoJSON(req, res) {
  const { vehicle_id } = req.query;
  try {
    const result = await pool.query(`SELECT get_geofences_geojson($1) AS fc`, [
      vehicle_id || null,
    ]);
    return success(
      res,
      result.rows[0]?.fc || { type: "FeatureCollection", features: [] },
      200
    );
  } catch (err) {
    console.error("Get geofences GeoJSON error:", err);
    return error(
      res,
      "An internal error occurred while fetching geofences geojson",
      500
    );
  }
}

async function getGeofenceById(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT id, name, vehicle_id, ST_AsGeoJSON(boundary)::json as boundary, trigger_type, created_at, updated_at
      FROM geofences
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return error(res, "Geofence not found", 404);
    }

    return success(res, { geofence: result.rows[0] }, 200);
  } catch (err) {
    console.error("Get geofence by ID error:", err);
    return error(
      res,
      "An internal error occurred while fetching geofence",
      500
    );
  }
}

async function updateGeofence(req, res) {
  const { id } = req.params;
  const { name, boundary, trigger_type } = req.body;

  if (!name && !boundary && !trigger_type) {
    return error(
      res,
      "At least one field (name, boundary, trigger_type) is required for update",
      400
    );
  }

  try {
    let query = "UPDATE geofences SET updated_at = NOW()";
    const params = [];
    let paramCount = 1;

    if (name) {
      query += `, name = $${paramCount}`;
      params.push(name.trim());
      paramCount++;
    }

    if (boundary) {
      const geojsonStr =
        typeof boundary === "string" ? boundary : JSON.stringify(boundary);
      query += `, boundary = ST_GeomFromGeoJSON($${paramCount})::geometry(Polygon,4326)`;
      params.push(geojsonStr);
      paramCount++;
    }

    if (trigger_type) {
      const normalizedTrigger = trigger_type.toLowerCase();
      if (!ALLOWED_TRIGGERS.includes(normalizedTrigger)) {
        return error(res, "trigger_type must be one of: entry, exit, or both", 400);
      }
      query += `, trigger_type = $${paramCount}`;
      params.push(normalizedTrigger);
      paramCount++;
    }

    query += ` WHERE id = $${paramCount} RETURNING id, name, vehicle_id, ST_AsGeoJSON(boundary)::json AS boundary, trigger_type, created_at, updated_at`;
    params.push(id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return error(res, "Geofence not found", 404);
    }

    return success(
      res,
      {
        message: "Geofence updated successfully",
        geofence: result.rows[0],
      },
      200
    );
  } catch (err) {
    console.error("Update geofence error:", err);
    return error(
      res,
      "An internal error occurred while updating geofence",
      500
    );
  }
}

async function deleteGeofence(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM geofences WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return error(res, "Geofence not found", 404);
    }
    return success(res, { message: "Geofence deleted successfully" }, 200);
  } catch (err) {
    console.error("Delete geofence error:", err);
    return error(
      res,
      "An internal error occurred while deleting geofence",
      500
    );
  }
}

async function getGeofenceEvents(req, res) {
  const { geofence_id, vehicle_id, limit = 50 } = req.query;
  const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

  let parsedLimit = Number.parseInt(limit, 10);
  parsedLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 50;

  try {
    let query = `
      SELECT
        ge.id,
        ge.geofence_id,
        g.name AS geofence_name,
        ge.vehicle_id,
        ge.event_type,
        ST_Y(ge.location) AS latitude,
        ST_X(ge.location) AS longitude,
        ge.speed,
        ge.event_time,
        ge.created_at
      FROM geofence_events ge
      LEFT JOIN geofences g ON ge.geofence_id = g.id
      LEFT JOIN vehicles v ON ge.vehicle_id = v.vehicle_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (geofence_id) {
      query += ` AND ge.geofence_id = $${paramCount}`;
      params.push(geofence_id);
      paramCount++;
    }

    if (vehicle_id) {
      query += ` AND ge.vehicle_id = $${paramCount}`;
      params.push(vehicle_id);
      paramCount++;
    }

    if (fleetGroupIds) {
      query += ` AND (ge.vehicle_id IS NULL OR v.fleet_group_id = ANY($${paramCount}::bigint[]))`;
      params.push(fleetGroupIds);
      paramCount++;
    }

    query += ` ORDER BY ge.event_time DESC LIMIT $${paramCount}`;
    params.push(parsedLimit);

    const result = await pool.query(query, params);
    return success(
      res,
      {
        total: result.rows.length,
        events: result.rows,
      },
      200
    );
  } catch (err) {
    console.error("Get geofence events error:", err);
    return error(
      res,
      "An internal error occurred while fetching geofence events",
      500
    );
  }
}

async function discoverFrequentStops(req, res) {
  const { vehicle_id, days = 7, min_points = 3, radius_km = 0.5 } = req.query;

  const parsedDays = Number.parseInt(days, 10);
  const parsedRadius = Number.parseFloat(radius_km);
  const parsedMinPoints = Number.parseInt(min_points, 10);

  const safeDays =
    Number.isInteger(parsedDays) && parsedDays > 0
      ? Math.min(parsedDays, 365)
      : 7;
  const safeRadius =
    !Number.isNaN(parsedRadius) && parsedRadius > 0
      ? Math.min(parsedRadius, 50)
      : 0.5;
  const safeMinPoints =
    Number.isInteger(parsedMinPoints) && parsedMinPoints > 0
      ? Math.min(parsedMinPoints, 100)
      : 3;

  try {
    const result = await pool.query(
      `SELECT get_frequent_stops_geojson($1, $2, $3, $4) AS fc`,
      [vehicle_id || null, safeDays, safeRadius, safeMinPoints]
    );

    const fc = result.rows[0]?.fc ?? { type: "FeatureCollection", features: [] };

    return success(
      res,
      {
        total_clusters: fc.features ? fc.features.length : 0,
        clusters: fc.features || [],
      },
      200
    );
  } catch (err) {
    console.error("Discover frequent stops error:", err);
    return error(
      res,
      "An internal error occurred while discovering frequent stops",
      500
    );
  }
}

async function discoverFrequentEvents(req, res) {
  const {
    vehicle_id,
    event_category,
    event_detail,
    days = 7,
    min_points = 3,
    radius_km = 0.5,
  } = req.query;

  const parsedDays = Number.parseInt(days, 10);
  const parsedRadius = Number.parseFloat(radius_km);
  const parsedMinPoints = Number.parseInt(min_points, 10);

  const safeDays =
    Number.isInteger(parsedDays) && parsedDays > 0
      ? Math.min(parsedDays, 365)
      : 7;
  const safeRadius =
    !Number.isNaN(parsedRadius) && parsedRadius > 0
      ? Math.min(parsedRadius, 50)
      : 0.5;
  const safeMinPoints =
    Number.isInteger(parsedMinPoints) && parsedMinPoints > 0
      ? Math.min(parsedMinPoints, 100)
      : 3;

  try {
    const result = await pool.query(
      `SELECT get_frequent_hotspots_geojson($1, $2, $3, $4, $5, $6) AS fc`,
      [
        event_category || null,
        event_detail || null,
        vehicle_id || null,
        safeDays,
        safeRadius,
        safeMinPoints,
      ]
    );

    const fc = result.rows[0]?.fc ?? { type: "FeatureCollection", features: [] };

    return success(
      res,
      {
        total_hotspots: fc.features ? fc.features.length : 0,
        hotspots: fc.features || [],
      },
      200
    );
  } catch (err) {
    console.error("Discover frequent events error:", err);
    return error(
      res,
      "An internal error occurred while discovering frequent events",
      500
    );
  }
}

async function createGeofenceFromCluster(req, res) {
  const { name, vehicle_id, center_lat, center_lng, radius_km = 0.5 } = req.body;

  if (
    !name ||
    !name.trim() ||
    center_lat === undefined ||
    center_lng === undefined
  ) {
    return error(res, "Name, center_lat, and center_lng are required", 400);
  }

  const lat = Number.parseFloat(center_lat);
  const lng = Number.parseFloat(center_lng);
  const radius = Number.parseFloat(radius_km);

  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return error(
      res,
      "Invalid geographic coordinates provided for center_lat and center_lng",
      400
    );
  }

  const safeRadius =
    !Number.isNaN(radius) && radius > 0 ? Math.min(radius, 50) : 0.5;

  try {
    const result = await pool.query(
      `INSERT INTO geofences (name, vehicle_id, boundary, trigger_type)
       VALUES ($1, $2, make_circular_geofence_boundary($3, $4, $5), $6)
       RETURNING id, name, vehicle_id, ST_AsGeoJSON(boundary)::json AS boundary, trigger_type, created_at, updated_at`,
      [name.trim(), vehicle_id || null, lng, lat, safeRadius, "both"]
    );

    return success(
      res,
      {
        message: "Geofence created successfully from historical cluster data",
        geofence: result.rows[0],
      },
      201
    );
  } catch (err) {
    console.error("Create geofence from cluster error:", err);
    return error(
      res,
      "An internal error occurred while creating cluster geofence",
      500
    );
  }
}

async function deleteGeofenceEvents(req, res) {
  const { geofence_id, event_type, before } = req.query;

  if (!geofence_id && !event_type && !before) {
    return error(
      res,
      "At least one filter parameter (geofence_id, event_type, or before) must be specified for bulk deletion",
      400
    );
  }

  try {
    const conditions = [];
    const params = [];

    if (geofence_id) {
      params.push(geofence_id);
      conditions.push(`geofence_id = $${params.length}`);
    }
    if (event_type) {
      params.push(event_type);
      conditions.push(`event_type = $${params.length}`);
    }
    if (before) {
      const parsedBefore = new Date(before);
      if (Number.isNaN(parsedBefore.getTime())) {
        return error(res, "Invalid date format for parameter 'before'", 400);
      }
      params.push(parsedBefore);
      conditions.push(`event_time < $${params.length}`);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const result = await pool.query(
      `DELETE FROM geofence_events ${where}`,
      params
    );

    return success(
      res,
      {
        deleted: result.rowCount,
        scope: { geofence_id, event_type, before },
      },
      200
    );
  } catch (err) {
    console.error("Delete geofence events error:", err);
    return error(
      res,
      "An internal error occurred while deleting geofence events",
      500
    );
  }
}

module.exports = {
  createGeofence,
  getGeofences,
  getGeofencesGeoJSON,
  getGeofenceById,
  updateGeofence,
  deleteGeofence,
  getGeofenceEvents,
  discoverFrequentStops,
  discoverFrequentEvents,
  createGeofenceFromCluster,
  deleteGeofenceEvents,
};
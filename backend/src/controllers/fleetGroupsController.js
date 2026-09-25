const { pool } = require("../db/pool");
const { success, error } = require("../utils/response");

// Helper to sanitize fleet group array passed down from auth middleware
const getFleetGroupParam = (fleetGroupIds) => {
  return Array.isArray(fleetGroupIds) && fleetGroupIds.length > 0 ? fleetGroupIds : null;
};

async function createFleetGroup(req, res) {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return error(res, "name is required", 400);
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO fleet_groups (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description, created_at
      `,
      [name.trim(), description ? description.trim() : null]
    );

    const group = {
      ...result.rows[0],
      vehicle_count: 0,
      assigned_managers: [],
      is_unassigned: true,
    };

    return success(res, { group }, 201);
  } catch (err) {
    if (err.code === "23505") {
      return error(res, "A fleet group with this name already exists", 409);
    }

    console.error("Create fleet group error:", err);
    return error(res, "An internal error occurred while creating fleet group", 500);
  }
}

/**
 * GET api/fleet-groups
 * Admin only. Lists fleet groups with their vehicle counts and assigned managers
 */
async function listFleetGroups(req, res) {
  try {
    const result = await pool.query(`
      SELECT fg.id, fg.name, fg.description, fg.created_at,
        COUNT(DISTINCT v.vehicle_id) AS vehicle_count,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email)
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) AS assigned_managers
      FROM fleet_groups fg
      LEFT JOIN vehicles v ON v.fleet_group_id = fg.id
      LEFT JOIN fleet_manager_assignments fma ON fma.fleet_group_id = fg.id
      LEFT JOIN users u ON u.id = fma.fleet_manager_id AND u.role IN ('fleet_manager', 'manager') AND u.is_active = true
      WHERE fg.deleted_at IS NULL
      GROUP BY fg.id, fg.name, fg.description, fg.created_at
      ORDER BY fg.name ASC
    `);

    const groups = result.rows.map((row) => ({
      ...row,
      vehicle_count: Number.parseInt(row.vehicle_count, 10) || 0,
      is_unassigned: row.assigned_managers.length === 0,
    }));

    return success(res, { groups }, 200);
  } catch (err) {
    console.error("List fleet groups error:", err);
    return error(res, "An internal error occurred while fetching fleet groups", 500);
  }
}

/**
 * POST /api/fleet-groups/:id/assignments
 * Admin only.
 */
async function assignFleetManager(req, res) {
  const { id: fleetGroupId } = req.params;
  const { managerId } = req.body;

  if (!managerId) {
    return error(res, "managerId is required", 400);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const groupResult = await client.query(
      "SELECT id FROM fleet_groups WHERE id = $1 AND deleted_at IS NULL",
      [fleetGroupId]
    );
    if (groupResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return error(res, "Fleet group not found", 404);
    }

    const userResult = await client.query(
      "SELECT id, role, is_active FROM users WHERE id = $1",
      [managerId]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return error(res, "User not found", 404);
    }

    if (!["fleet_manager", "manager"].includes(userResult.rows[0].role)) {
      await client.query("ROLLBACK");
      return error(res, "User is not a Fleet Manager", 400);
    }

    if (!userResult.rows[0].is_active) {
      await client.query("ROLLBACK");
      return error(res, "Cannot assign a deactivated user", 400);
    }

    const existingResult = await client.query(
      "SELECT fleet_manager_id FROM fleet_manager_assignments WHERE fleet_group_id = $1 AND fleet_manager_id = $2",
      [fleetGroupId, managerId]
    );

    if (existingResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return error(res, "This manager is already assigned to this fleet group", 409);
    }

    await client.query(
      `
      INSERT INTO fleet_manager_assignments (fleet_manager_id, fleet_group_id, assigned_by)
      VALUES ($1, $2, $3)
      `,
      [managerId, fleetGroupId, req.user.id]
    );

    await client.query(
      `
      INSERT INTO fleet_assignment_audit_log (action, fleet_manager_id, fleet_group_id, performed_by)
      VALUES ('ASSIGNED', $1, $2, $3)
      `,
      [managerId, fleetGroupId, req.user.id]
    );

    await client.query("COMMIT");

    return success(res, { message: "Fleet manager assigned successfully" }, 201);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return error(res, "This manager is already assigned to this fleet group", 409);
    }

    console.error("Assign fleet manager error:", err);
    return error(res, "An internal error occurred while assigning fleet manager", 500);
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/fleet-groups/:id/assignments/:managerId
 * Admin only.
 */
async function removeFleetManagerAssignment(req, res) {
  const { id: fleetGroupId, managerId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const assignmentResult = await client.query(
      "SELECT id FROM fleet_manager_assignments WHERE fleet_group_id = $1 AND fleet_manager_id = $2",
      [fleetGroupId, managerId]
    );

    if (assignmentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return error(res, "Assignment not found", 404);
    }

    await client.query(
      `
      INSERT INTO fleet_assignment_audit_log (action, fleet_manager_id, fleet_group_id, performed_by)
      VALUES ('REMOVED', $1, $2, $3)
      `,
      [managerId, fleetGroupId, req.user.id]
    );

    await client.query(
      `
      DELETE FROM fleet_manager_assignments WHERE fleet_group_id = $1 AND fleet_manager_id = $2
      `,
      [fleetGroupId, managerId]
    );

    await client.query("COMMIT");

    return success(res, { message: "Fleet manager assignment removed successfully" }, 200);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Remove fleet manager assignment error:", err);
    return error(res, "An internal error occurred while removing fleet manager assignment", 500);
  } finally {
    client.release();
  }
}

async function bulkAssignVehiclesToGroup(req, res) {
  const { id: fleetGroupId } = req.params;
  const { vehicleIds } = req.body;

  if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
    return error(res, "vehicleIds must be a non-empty array", 400);
  }

  try {
    const groupResult = await pool.query(
      "SELECT id FROM fleet_groups WHERE id = $1 AND deleted_at IS NULL",
      [fleetGroupId]
    );

    if (groupResult.rows.length === 0) {
      return error(res, "Fleet group not found", 404);
    }

    const updateResult = await pool.query(
      `
      UPDATE vehicles SET fleet_group_id = $1
      WHERE vehicle_id = ANY($2::text[])
      RETURNING vehicle_id
      `,
      [fleetGroupId, vehicleIds]
    );

    const updatedIds = updateResult.rows.map((row) => row.vehicle_id);
    const notFoundIds = vehicleIds.filter((id) => !updatedIds.includes(id));

    return success(
      res,
      {
        message: `${updatedIds.length} vehicle(s) assigned successfully`,
        updated: updatedIds,
        not_found: notFoundIds,
      },
      200
    );
  } catch (err) {
    console.error("Bulk assign vehicles error:", err);
    return error(res, "An internal error occurred while assigning vehicles", 500);
  }
}

async function listMyFleetGroups(req, res) {
  try {
    if (Array.isArray(req.fleetGroupIds) && req.fleetGroupIds.length === 0) {
      return success(res, { groups: [] }, 200);
    }

    const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

    const result = await pool.query(
      `
      SELECT fg.id, fg.name, fg.description,
      COUNT(DISTINCT v.vehicle_id) AS vehicle_count
      FROM fleet_groups fg
      LEFT JOIN vehicles v ON v.fleet_group_id = fg.id
      WHERE ($1::bigint[] IS NULL OR fg.id = ANY($1::bigint[])) AND fg.deleted_at IS NULL
      GROUP BY fg.id, fg.name, fg.description
      ORDER BY fg.name ASC
      `,
      [fleetGroupIds]
    );

    const groups = result.rows.map((row) => ({
      ...row,
      vehicle_count: Number.parseInt(row.vehicle_count, 10) || 0,
    }));

    return success(res, { groups }, 200);
  } catch (err) {
    console.error("List my fleet groups error:", err);
    return error(res, "An internal error occurred while fetching your fleet groups", 500);
  }
}

async function getManagerLeaderboard(req, res) {
  let limit = Number.parseInt(req.query.limit, 10);
  limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 20) : 5;

  try {
    const result = await pool.query(
      `
      SELECT
        u.id AS manager_id,
        u.name AS manager_name,
        COUNT(DISTINCT fma.fleet_group_id) AS group_count,
        COUNT(DISTINCT v.vehicle_id) AS vehicle_count,
        ROUND(AVG(dss.safety_score)::numeric, 1) AS avg_safety_score
      FROM fleet_manager_assignments fma
      JOIN users u
        ON u.id = fma.fleet_manager_id
        AND u.role IN ('fleet_manager', 'manager')
        AND u.is_active = true
      JOIN vehicles v
        ON v.fleet_group_id = fma.fleet_group_id
      JOIN driver_daily_safety_scores dss
        ON dss.vehicle_id = v.vehicle_id
        AND dss.score_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY u.id, u.name
      HAVING COUNT(dss.*) > 0
      ORDER BY avg_safety_score DESC, vehicle_count DESC
      LIMIT $1
      `,
      [limit]
    );

    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      manager_id: row.manager_id,
      manager_name: row.manager_name,
      group_count: Number.parseInt(row.group_count, 10) || 0,
      vehicle_count: Number.parseInt(row.vehicle_count, 10) || 0,
      avg_safety_score: Number.parseFloat(row.avg_safety_score) || 0,
    }));

    return success(res, { leaderboard }, 200);
  } catch (err) {
    console.error("Get manager leaderboard error:", err);
    return error(res, "An internal error occurred while fetching manager leaderboard", 500);
  }
}

async function updateFleetGroup(req, res) {
  const { id: fleetGroupId } = req.params;
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return error(res, "name is required", 400);
  }

  try {
    const groupResult = await pool.query(
      "SELECT id FROM fleet_groups WHERE id = $1 AND deleted_at IS NULL",
      [fleetGroupId]
    );
    if (groupResult.rows.length === 0) {
      return error(res, "Fleet group not found", 404);
    }

    const result = await pool.query(
      `
      UPDATE fleet_groups
      SET name = $1, description = $2, updated_at = now()
      WHERE id = $3
      RETURNING id, name, description, created_at
      `,
      [name.trim(), description ? description.trim() : null, fleetGroupId]
    );

    return success(res, { group: result.rows[0] }, 200);
  } catch (err) {
    if (err.code === "23505") {
      return error(res, "A fleet group with this name already exists", 409);
    }

    console.error("Update fleet group error:", err);
    return error(res, "An internal error occurred while updating fleet group", 500);
  }
}

async function deleteFleetGroup(req, res) {
  const { id: fleetGroupId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const groupResult = await client.query(
      "SELECT id, name FROM fleet_groups WHERE id = $1 AND deleted_at IS NULL",
      [fleetGroupId]
    );
    if (groupResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return error(res, "Fleet group not found", 404);
    }

    const assignmentResult = await client.query(
      "SELECT fleet_manager_id FROM fleet_manager_assignments WHERE fleet_group_id = $1",
      [fleetGroupId]
    );

    for (const row of assignmentResult.rows) {
      await client.query(
        `
        INSERT INTO fleet_assignment_audit_log (action, fleet_manager_id, fleet_group_id, performed_by)
        VALUES ('REMOVED', $1, $2, $3)
        `,
        [row.fleet_manager_id, fleetGroupId, req.user.id]
      );
    }

    await client.query("DELETE FROM fleet_manager_assignments WHERE fleet_group_id = $1", [
      fleetGroupId,
    ]);
    await client.query("UPDATE vehicles SET fleet_group_id = NULL WHERE fleet_group_id = $1", [
      fleetGroupId,
    ]);
    await client.query("UPDATE fleet_groups SET deleted_at = now() WHERE id = $1", [fleetGroupId]);

    await client.query("COMMIT");

    return success(
      res,
      { message: `Fleet group "${groupResult.rows[0].name}" deleted successfully` },
      200
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Delete fleet group error:", err);
    return error(res, "An internal error occurred while deleting fleet group", 500);
  } finally {
    client.release();
  }
}

async function unassignVehiclesFromGroup(req, res) {
  const { id: fleetGroupId } = req.params;
  const { vehicleIds } = req.body;

  if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
    return error(res, "vehicleIds must be a non-empty array", 400);
  }

  try {
    const updateResult = await pool.query(
      `
      UPDATE vehicles SET fleet_group_id = NULL
      WHERE vehicle_id = ANY($1::text[]) AND fleet_group_id = $2
      RETURNING vehicle_id
      `,
      [vehicleIds, fleetGroupId]
    );

    return success(
      res,
      {
        message: `${updateResult.rows.length} vehicle(s) unassigned successfully`,
        updated: updateResult.rows.map((row) => row.vehicle_id),
      },
      200
    );
  } catch (err) {
    console.error("Unassign vehicles error:", err);
    return error(res, "An internal error occurred while unassigning vehicles", 500);
  }
}

async function listVehiclesForAssignment(req, res) {
  const { id: fleetGroupId } = req.params;
  const status = typeof req.query.status === "string" ? req.query.status.toLowerCase() : "unassigned";
  const search = typeof req.query.search === "string" ? req.query.search.trim() : null;

  let page = Number.parseInt(req.query.page, 10);
  page = Number.isInteger(page) && page > 0 ? page : 1;

  let limit = Number.parseInt(req.query.limit, 10);
  limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;

  const offset = (page - 1) * limit;
  const allowed_statuses = ["unassigned", "in_group", "other"];

  if (!allowed_statuses.includes(status)) {
    return error(res, `status must be one of: ${allowed_statuses.join(", ")}`, 400);
  }

  try {
    const groupResult = await pool.query(
      "SELECT id FROM fleet_groups WHERE id = $1 AND deleted_at IS NULL",
      [fleetGroupId]
    );

    if (groupResult.rows.length === 0) {
      return error(res, "Fleet group not found", 404);
    }

    let statusClause;
    const baseParams = [];

    if (status === "unassigned") {
      statusClause = "v.fleet_group_id IS NULL";
    } else if (status === "in_group") {
      statusClause = "v.fleet_group_id = $1";
      baseParams.push(fleetGroupId);
    } else {
      statusClause = "v.fleet_group_id IS NOT NULL AND v.fleet_group_id != $1";
      baseParams.push(fleetGroupId);
    }

    let paramCount = baseParams.length + 1;
    let searchClause = "";
    const searchParams = [];

    if (search) {
      searchClause = ` AND vlc.province ILIKE $${paramCount}`;
      searchParams.push(`%${search}%`);
      paramCount++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM vehicles v 
       LEFT JOIN vehicle_location_cache vlc ON vlc.vehicle_id = v.vehicle_id
       WHERE ${statusClause}${searchClause}`,
      [...baseParams, ...searchParams]
    );

    const rowsResult = await pool.query(
      `SELECT v.vehicle_id AS id, v.fleet_group_id, fg.name AS fleet_group_name, vlc.province
       FROM vehicles v
       LEFT JOIN fleet_groups fg ON fg.id = v.fleet_group_id
       LEFT JOIN vehicle_location_cache vlc ON vlc.vehicle_id = v.vehicle_id
       WHERE ${statusClause}${searchClause}
       ORDER BY v.vehicle_id
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...baseParams, ...searchParams, limit, offset]
    );

    return success(
      res,
      {
        vehicles: rowsResult.rows,
        total: Number.parseInt(countResult.rows[0].count, 10) || 0,
        page,
        limit,
      },
      200
    );
  } catch (err) {
    console.error("List vehicles for assignment error:", err);
    return error(res, "An internal error occurred while listing vehicles for assignment", 500);
  }
}

module.exports = {
  createFleetGroup,
  listFleetGroups,
  assignFleetManager,
  removeFleetManagerAssignment,
  bulkAssignVehiclesToGroup,
  listMyFleetGroups,
  listVehiclesForAssignment,
  getManagerLeaderboard,
  updateFleetGroup,
  deleteFleetGroup,
  unassignVehiclesFromGroup,
};
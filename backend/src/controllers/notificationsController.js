const { pool } = require("../db/pool");
const { success, error } = require("../utils/response");

async function getNotifications(req, res) {
  if (!req.user || !req.user.id) {
    return error(res, "Unauthorized", 401);
  }

  let since;
  if (req.query.since) {
    since = new Date(req.query.since);
    if (Number.isNaN(since.getTime())) {
      return error(res, "Invalid 'since' parameter. Use an ISO 8601 date string", 400);
    }
  } else {
    // Default to epoch so all notifications are returned if no 'since' timestamp is provided
    since = new Date(0);
  }

  let limit = Number.parseInt(req.query.limit, 10);
  limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 50;

  try {
    const result = await pool.query(
      `
      SELECT
        fal.id,
        fal.action,
        fal.performed_at,
        fg.name AS fleet_group_name
      FROM fleet_assignment_audit_log fal
      JOIN fleet_groups fg ON fg.id = fal.fleet_group_id
      WHERE fal.fleet_manager_id = $1
        AND fal.performed_at > $2
      ORDER BY fal.performed_at ASC
      LIMIT $3
      `,
      [req.user.id, since, limit]
    );

    const notifications = result.rows.map((row) => ({
      id: row.id,
      action: row.action,
      fleet_group_name: row.fleet_group_name,
      performed_at: row.performed_at,
      message:
        row.action === "ASSIGNED"
          ? `You have been added to Fleet Group: ${row.fleet_group_name}`
          : `You no longer have access to Fleet Group: ${row.fleet_group_name}`,
    }));

    return success(
      res,
      {
        notifications,
        checked_at: new Date().toISOString(),
      },
      200
    );
  } catch (err) {
    console.error("Get notifications error:", err);
    return error(
      res,
      "An internal error occurred while fetching notifications",
      500
    );
  }
}

module.exports = { getNotifications };
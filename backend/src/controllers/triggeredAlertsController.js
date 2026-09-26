// controllers/triggeredAlertsController.js
const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');

// Helper to validate date inputs
function isValidDate(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !Number.isNaN(d.getTime());
}

async function findAlertForUpdate(client, id) {
    const result = await client.query(
        `SELECT * FROM triggered_alerts WHERE id = $1 FOR UPDATE`,
        [id]
    );
    return result.rows[0] || null;
}

async function managerHasFleetAccess(client, managerId, fleetGroupId) {
    const result = await client.query(
        `SELECT 1 FROM fleet_manager_assignments
         WHERE fleet_manager_id = $1 AND fleet_group_id = $2`,
        [managerId, fleetGroupId]
    );
    return result.rows.length > 0;
}

/**
 * List triggered alerts with filtering and pagination
 * GET /api/alerts/triggered
 */
async function listTriggeredAlerts(req, res) {
    const managerId = req.user.id;
    const {
        fleet_group_id,
        vehicle_id,
        status,
        condition_type,
        limit = 50,
        offset = 0,
        start_date,
        end_date
    } = req.query;

    // Sanitize and clamp pagination inputs to prevent DoS or SQL errors
    const parsedLimit = Number.parseInt(limit, 10);
    const parsedOffset = Number.parseInt(offset, 10);
    const limitInt = Number.isNaN(parsedLimit) ? 50 : Math.max(1, Math.min(parsedLimit, 100));
    const offsetInt = Number.isNaN(parsedOffset) ? 0 : Math.max(0, parsedOffset);

    try {
        // Get all fleet groups this manager has access to
        const fleetsResult = await pool.query(
            `SELECT fleet_group_id
             FROM fleet_manager_assignments
             WHERE fleet_manager_id = $1`,
            [managerId]
        );

        const accessibleFleetIds = fleetsResult.rows.map(row => row.fleet_group_id);

        if (accessibleFleetIds.length === 0) {
            return success(res, {
                data: [],
                pagination: { total: 0, limit: limitInt, offset: offsetInt, hasMore: false }
            });
        }

        // Build WHERE clause
        let whereConditions = [`ta.fleet_group_id = ANY($1)`];
        let queryParams = [accessibleFleetIds];
        let paramIndex = 2;

        if (fleet_group_id) {
            const parsedFleetId = Number.parseInt(fleet_group_id, 10);
            if (!accessibleFleetIds.includes(parsedFleetId)) {
                return error(res, 'Access denied to this fleet group', 403);
            }
            whereConditions.push(`ta.fleet_group_id = $${paramIndex}`);
            queryParams.push(parsedFleetId);
            paramIndex++;
        }

        if (vehicle_id) {
            whereConditions.push(`ta.vehicle_id = $${paramIndex}`);
            queryParams.push(vehicle_id);
            paramIndex++;
        }

        if (status) {
            whereConditions.push(`ta.status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        if (condition_type) {
            whereConditions.push(`ta.condition_type = $${paramIndex}`);
            queryParams.push(condition_type);
            paramIndex++;
        }

        if (start_date) {
            if (!isValidDate(start_date)) {
                return error(res, 'Invalid start_date parameter format', 400);
            }
            whereConditions.push(`ta.created_at >= $${paramIndex}`);
            queryParams.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            if (!isValidDate(end_date)) {
                return error(res, 'Invalid end_date parameter format', 400);
            }
            whereConditions.push(`ta.created_at <= $${paramIndex}`);
            queryParams.push(end_date);
            paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countResult = await pool.query(
            `SELECT COUNT(*) as total
             FROM triggered_alerts ta
             WHERE ${whereClause}`,
            queryParams
        );
        const total = Number.parseInt(countResult.rows[0].total, 10);

        // Get paginated results
        const result = await pool.query(
            `SELECT
                ta.id,
                ta.rule_id,
                ta.vehicle_id,
                ta.fleet_group_id,
                ta.condition_type,
                ta.breach_value,
                ta.threshold_value,
                ta.latitude,
                ta.longitude,
                ta.status,
                ta.acknowledged_at,
                ta.resolved_at,
                ta.created_at,
                ta.rule_snapshot,
                r.name AS rule_name
             FROM triggered_alerts ta
             LEFT JOIN custom_alert_rules r ON r.id = ta.rule_id
             WHERE ${whereClause}
             ORDER BY ta.created_at DESC
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...queryParams, limitInt, offsetInt]
        );

        return success(res, {
            data: result.rows,
            pagination: {
                total,
                limit: limitInt,
                offset: offsetInt,
                hasMore: offsetInt + limitInt < total
            }
        });
    } catch (err) {
        console.error('List triggered alerts error:', err);
        return error(res, 'Failed to fetch triggered alerts', 500);
    }
}

/**
 * Get alert details with full context
 * GET /api/alerts/triggered/:id
 */
async function getAlertDetails(req, res) {
    const managerId = req.user.id;
    const { id } = req.params;

    try {
        const alertResult = await pool.query(
            `SELECT
                ta.*,
                r.name AS rule_name,
                r.condition_type AS rule_condition_type,
                r.condition_params AS rule_params,
                r.status AS rule_status,
                g.name AS fleet_group_name
             FROM triggered_alerts ta
             JOIN fleet_manager_assignments fma
                ON fma.fleet_group_id = ta.fleet_group_id
               AND fma.fleet_manager_id = $2
             LEFT JOIN custom_alert_rules r ON r.id = ta.rule_id
             LEFT JOIN fleet_groups g ON g.id = ta.fleet_group_id
             WHERE ta.id = $1`,
            [id, managerId]
        );

        if (alertResult.rows.length === 0) {
            return error(res, 'Alert not found', 404);
        }

        const alert = alertResult.rows[0];

        return success(res, {
            ...alert,
            vehicle_link: `/vehicles/${alert.vehicle_id}`
        });
    } catch (err) {
        console.error('Get alert details error:', err);
        return error(res, 'Failed to fetch alert details', 500);
    }
}

/**
 * Acknowledge an alert
 * PUT /api/alerts/triggered/:id/acknowledge
 */
async function acknowledgeAlert(req, res) {
    const managerId = req.user.id;
    const { id } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const alert = await findAlertForUpdate(client, id);

        if (!alert) {
            await client.query('ROLLBACK');
            return error(res, 'Alert not found', 404);
        }

        if (!(await managerHasFleetAccess(client, managerId, alert.fleet_group_id))) {
            await client.query('ROLLBACK');
            return error(res, 'Access denied', 403);
        }

        if (alert.status !== 'new') {
            await client.query('ROLLBACK');
            return error(res, `Alert cannot be acknowledged because it is already ${alert.status}`, 400);
        }

        const updateResult = await client.query(
            `UPDATE triggered_alerts
             SET status = 'acknowledged',
                 acknowledged_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        await client.query('COMMIT');

        return success(res, {
            message: 'Alert acknowledged successfully',
            alert: updateResult.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Acknowledge alert error:', err);
        return error(res, 'Failed to acknowledge alert', 500);
    } finally {
        client.release();
    }
}

/**
 * Resolve an alert (only if acknowledged)
 * PUT /api/alerts/triggered/:id/resolve
 */
async function resolveAlert(req, res) {
    const managerId = req.user.id;
    const { id } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const alert = await findAlertForUpdate(client, id);
        if (!alert) {
            await client.query('ROLLBACK');
            return error(res, 'Alert not found', 404);
        }

        if (!(await managerHasFleetAccess(client, managerId, alert.fleet_group_id))) {
            await client.query('ROLLBACK');
            return error(res, 'Access denied', 403);
        }

        if (alert.status === 'new') {
            await client.query('ROLLBACK');
            return error(res, 'Alert must be acknowledged before it can be resolved', 400);
        }

        if (alert.status === 'resolved') {
            await client.query('ROLLBACK');
            return error(res, 'Alert is already resolved', 400);
        }

        const updateResult = await client.query(
            `UPDATE triggered_alerts
             SET status = 'resolved',
                 resolved_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        await client.query('COMMIT');

        return success(res, {
            message: 'Alert resolved successfully',
            alert: updateResult.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Resolve alert error:', err);
        return error(res, 'Failed to resolve alert', 500);
    } finally {
        client.release();
    }
}

/**
 * Get count of new (unacknowledged) alerts
 * GET /api/alerts/count/new
 */
async function getNewAlertCount(req, res) {
    const managerId = req.user.id;
    const { fleet_group_id } = req.query;

    try {
        let query = `
            SELECT COUNT(*) as count
            FROM triggered_alerts ta
            WHERE ta.status = 'new'
              AND EXISTS (
                  SELECT 1 FROM fleet_manager_assignments fma
                  WHERE fma.fleet_manager_id = $1
                    AND fma.fleet_group_id = ta.fleet_group_id
              )
        `;
        let params = [managerId];

        if (fleet_group_id) {
            const parsedFleetId = Number.parseInt(fleet_group_id, 10);
            if (Number.isNaN(parsedFleetId)) {
                return error(res, 'Invalid fleet_group_id parameter', 400);
            }
            query += ` AND ta.fleet_group_id = $2`;
            params.push(parsedFleetId);
        }

        const result = await pool.query(query, params);

        return success(res, {
            count: Number.parseInt(result.rows[0].count, 10)
        });
    } catch (err) {
        console.error('Get new alert count error:', err);
        return error(res, 'Failed to get alert count', 500);
    }
}

/**
 * Polling endpoint for newly triggered alerts
 * GET /api/alerts/new
 */
async function getNewTriggeredAlerts(req, res) {
    const managerId = req.user.id;
    const sinceParam = req.query.since;
    const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 60000); // default: last 60s

    if (Number.isNaN(since.getTime())) {
        return error(res, 'Invalid since parameter format', 400);
    }

    try {
        const result = await pool.query(
            `
            SELECT ta.id, ta.vehicle_id, ta.condition_type, ta.breach_value,
                   ta.threshold_value, ta.created_at, ta.rule_snapshot,
                   fg.name AS fleet_group_name
            FROM triggered_alerts ta
            JOIN fleet_manager_assignments fma ON fma.fleet_group_id = ta.fleet_group_id
            JOIN fleet_groups fg ON fg.id = ta.fleet_group_id
            WHERE fma.fleet_manager_id = $1
              AND ta.status = 'new'
              AND ta.created_at > $2
            ORDER BY ta.created_at ASC
            `,
            [managerId, since]
        );

        return success(res, {
            alerts: result.rows,
            checked_at: new Date().toISOString(),
        }, 200);
    } catch (err) {
        console.error('Get new triggered alerts error:', err);
        return error(res, 'Failed to fetch new alerts', 500);
    }
}

module.exports = {
    listTriggeredAlerts,
    getAlertDetails,
    acknowledgeAlert,
    resolveAlert,
    getNewAlertCount,
    getNewTriggeredAlerts,
};
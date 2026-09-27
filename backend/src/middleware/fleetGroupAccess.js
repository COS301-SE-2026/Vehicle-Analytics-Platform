const {pool} = require('../db/pool');
const {error} = require('../utils/response');

/**
 * Scopes request to only fleet groups current user is allowed to see.
 * Looked up fresh from db on every request, not cached in JWT session,
 * so that changes take effect immediately rather than on next login.
 *
 * Sets req.fleetGroupIds:
 * null         = unrestricted
 * [ids...]     = fleet_manager, scoped to these groups
 * []           = treated the same as null (no restriction) so that a
 *                manager who hasn't been assigned to a group yet can
 *                still see the fleet instead of getting an empty view.
 *
 * Re-checks role and is_active on every call, so a manager who was
 * demoted or deactivated loses access on their next request.
 */
async function requireFleetGroupAccess(req, res, next) {
    if (!req.user) {
        return error(res, 'Authentication required', 401);
    }

    if (req.user.role === 'admin') {
        req.fleetGroupIds = null;
        return next();
    }

    if (req.user.role !== 'fleet_manager' && req.user.role !== 'manager') {
        req.fleetGroupIds = null;
        return next();
    }

    try {
        const result = await pool.query(
            `SELECT fma.fleet_group_id
             FROM fleet_manager_assignments fma
             JOIN users u ON u.id = fma.fleet_manager_id
             WHERE fma.fleet_manager_id = $1
                AND u.role IN ('fleet_manager', 'manager')
                AND u.is_active = true
            `, [req.user.id]
        );

        const ids = result.rows.map((row) => row.fleet_group_id);

        // Empty assignment list means the manager has no groups yet.
        // Treat this as "no restriction" so they can still see the fleet,
        // rather than the SQL filter matching nothing and returning
        // an empty response.
        req.fleetGroupIds = ids.length > 0 ? ids : null;
        next();
    } catch (err) {
        console.error('requireFleetGroupAccess error:', err.message);
        return error(res, 'Failed to verify fleet group access', 500);
    }
}

module.exports = {requireFleetGroupAccess};

const {pool} = require('../db/pool');
const {error} = require('../utils/response');

/**
 * Scopes request to only fleet groups current user is allowed to see.
 * Lookd up fresh from db on every request not cached in JWT session
 * This is so that effects take place same time not on next login
 * 
 * Sets req.fleetGroupIds:
 * null         = unrestricted
 * [ids...]     = fleet_manager, scoped to these groups
 * []           = fleet_manager with no assignments currently. NOT rejected for purpose of "no assigned fleet group" state
 * 
 * 
 * Re checks role and is_active on every call meaning a manager who was demoted
 * or deactivated after being assigned loses access on their next request not next login
 */

async function requireFleetGroupAccess(req, res, next) {
    if(!req.user){
        return error(res, 'Authentication required', 401);
    }

    if(req.user.role === 'admin') {
        req.fleetGroupIds = null;
        return next();
    }

    if(req.user.role !== 'fleet_manager') {
        //scoped only to this user. idk if viewer will be scoped as well
        //decide

        req.fleetGroupIds = null;
        return next();
    }

    try {
        const result = await pool.query(
            `SELECT fma.fleet_group_id
             FROM fleet_manager_assignments fma
             JOIN users u ON u.id = fma.fleet_manager_id
             WHERE fma.fleet_manager_id = $1
                AND u.role = 'fleet_manager'
                AND u.is_active = true
            `, [req.user.id]
        );

        req.fleetGroupIds = result.rows.map((row) => row.fleet_group_id);
        next();

    }catch (err) {
        console.error('requireFleetGroupAccess error:', err.message);
        return error(res, 'Failed to verify fleet group access', 500);
    }
}

module.exports = {requireFleetGroupAccess};
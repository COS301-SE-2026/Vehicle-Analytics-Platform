const {pool} = require('../db/pool');
const {success, error} = require('../utils/response');

/**
 * GET api/fleet-groups
 * Admin only. Lists fleet groups with their vehicle counts and assigned managers
 * LEFT JOINs throughout so a group with no assined manager or no vehicles still appears
 * This is so that frontend can flag unassigned groups
 */

async function listFleetGroups(req, res) {
    try {
        const result = await pool.query(`
            SELECT fg.id, fg.name, fg.description, fg.created_at,
            COUNT(DISTINCT v.vehicle_id) AS vehicle_count,
            COALESCE(
                json_agg(
                    DISTINCT jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email))
                    FILTER (WHERE u.id IS NOT NULL),
                    '[]'
                ) AS assigned_managers
            FROM fleet_groups fg
            LEFT JOIN vehicles v ON v.fleet_group_id = fg.id
            LEFT JOIN fleet_manager_assignments fma ON fma.fleet_group_id = fg.id
            LEFT JOIN users u ON u.id = fma.fleet_manager_id AND u.role = 'fleet_manager' AND u.is_active = true
            GROUP BY fg.id, fg.name, fg.description, fg.created_at
            ORDER BY fg.name ASC
        `);

        const groups = result.rows.map((row) => ({
            ...row,
            vehicle_count: Number.parseInt(row.vehicle_count, 10),
            is_unassigned: row.assigned_managers.length === 0,
        }));


        return success(res, {groups}, 200);

    }catch (err) {
        const errorMessage = err.message || 'Failed to fetch fleet groups';
        console.error('List fleet groups error:', err);
        return error(res, 'Failed to fetch fleet groups: ' + errorMessage, 500);
    }
}

/**
 * POST /api/fleet-groups/:id/assignments
 * Admin only.
 * Validates target user is actually role = 'fleet_manager' at app layer
 * Relies on DB's unique constraint to reject duplicates.
 * Catches postgres error rather than pre checking
 * so that there is no race condition between a check and the insert
 */

async function assignFleetManager(req, res) {
    const {id: fleetGroupId} = req.params;
    const {managerId} = req.body;

    if(!managerId) {
        return error(res, 'managerId is required', 400);
    }

    try {
        const groupResult = await pool.query('SELECT id FROM fleet_groups WHERE id = $1', [fleetGroupId]);
        if (groupResult.rows.length === 0) {
            return error(res, 'Fleet group not found', 404);
        }


        const userResult = await pool.query('SELECT id, role, is_active FROM users WHERE id = $1', [managerId]);

        if(userResult.rows.length === 0) {
            return error(res, 'User not found', 404);
        }

        if(userResult.rows[0].role !== 'fleet_manager') {
            return error(res, 'User is not a Fleet Manager', 400);
        }

        if(!userResult.rows[0].is_active) {
            return error(res, 'Cannot assign a deactivated user', 400);
        }

        await pool.query(`
            INSERT INTO fleet_manager_assignments (fleet_manager_id, fleet_group_id, assigned_by)
            VALUES ($1, $2, $3)
            `, [managerId, fleetGroupId, req.user.id]
        );

        await pool.query(`
            INSERT INTO fleet_assignment_audit_log (action, fleet_manager_id, fleet_group_id, performed_by)
            VALUES ('ASSIGNED', $1, $2, $3)
            `, [managerId, fleetGroupId, req.user.id]
        ); 

        return success(res, {message: 'Fleet manager assigned successfully'}, 201);
    } catch (err) {
        if (err.code === '23505'){
            return error(res, 'This manager is already assigned to this fleet group', 409);
        }

        const errorMessage = err.message || 'Failed to assign fleet manager';
        console.error('Assign fleet manager error:', err);

        return error(res, 'Failed to assign fleet manager: ' + errorMessage, 500);
    }
}

/**
 * DELETE /api/fleet-groups/:id/assignments/:managerId
 * Admin only.
 * Removes assignment and writes audit log entry before deleting
 * So that log always has a row even if something odd happens
 */

async function removeFleetManagerAssignment(req, res) {
    const {id: fleetGroupId, managerId} = req.params;

    try {
        const assignmentResult = await pool.query('SELECT id FROM fleet_manager_assignments WHERE fleet_group_id = $1 AND fleet_manager_id = $2', [fleetGroupId, managerId]);

        if (assignmentResult.rows.length === 0) {
            return error(res, 'Assignment not found', 404);
        }

        await pool.query(`
            INSERT INTO fleet_assignment_audit_log (action, fleet_manager_id, fleet_group_id, performed_by)
            VALUES ('REMOVED', $1, $2, $3)
            `, [managerId, fleetGroupId, req.user.id]
        );

        await pool.query(`
            DELETE FROM fleet_manager_assignments WHERE fleet_group_id = $1 AND fleet_manager_id = $2
            `, [fleetGroupId, managerId]
        ); 

        return success(res, {message: 'Fleet manager assignment removed successfully'}, 200);
    } catch (err) {
        const errorMessage = err.message || 'Failed to remove fleet manager assignment';
        console.error('Remove fleet manager assignment error:', err);

        return error(res, 'Failed to remove fleet manager assignment: ' + errorMessage, 500);
    }
}

async function bulkAssignVehiclesToGroup(req, res) {
    const {id: fleetGroupId} = req.params;
    const {vehicleIds} = req.body;


    if(!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
        return error(res, 'vehicleIds must be a non empty array', 400);
    }

    try {
        const groupResult = await pool.query('SELECT id FROM fleet_groups WHERE id = $1', [fleetGroupId]);

        if(groupResult.rows.length === 0){
            return error(res, 'Fleet group not found', 404);
        }

        const updateResult = await pool.query(`
            UPDATE vehicles SET fleet_group_id = $1
            WHERE vehicle_id = ANY($2::text[])
            RETURNING vehicle_id
            `, [fleetGroupId, vehicleIds]
        );

        const updatedIds = updateResult.rows.map((row) => row.vehicle_id);
        const notFoundIds = vehicleIds.filter((id) => !updatedIds.includes(id));

        return success(res, {
            message: `${updatedIds.length} vehicle(s) assigned successfully`,
            updated: updatedIds,
            not_found: notFoundIds,
        }, 200);
    }catch(err) {
        console.error('Bulk assign vehicles error:', err);
        return error(res, 'Failed to bulk assign vehicles: ' + err.message, 500);
    }
}


module.exports = {listFleetGroups, assignFleetManager, removeFleetManagerAssignment, bulkAssignVehiclesToGroup};
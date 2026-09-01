const {pool} = require('../db/pool');
const {success, error} = require('../utils/response');

async function createFleetGroup(req, res) {
    const {name, description} = req.body;

    if(!name || !name.trim()) {
        return error(res, 'name is required', 400)
    }

    try {
        const result = await pool.query(`
            INSERT INTO fleet_groups (name, description)
            VALUES ($1, $2)
            RETURNING id, name, description, created_at
            `, [name.trim(), description ?? null]
        );

        const group = {
            ...result.rows[0],
            vehicle_count: 0,
            assigned_managers: [],
            is_unassigned: true,
        };

        return success(res, {group}, 201);
    }catch (err) {
        if(err.code === '23505') {
            return error(res, 'A fleet group with this name already exists', 409);
        }

        const errorMessage = err.message || 'Failed to create fleet group';
        console.error('Create fleet group error', err);
        return error(res, 'Failed to create fleet group: ' + errorMessage, 500);
    }
}

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
            LEFT JOIN users u ON u.id = fma.fleet_manager_id AND u.role IN ('fleet_manager', 'manager') AND u.is_active = true
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

        if(!['fleet_manager', 'manager'].includes(userResult.rows[0].role)) {
            return error(res, 'User is not a Fleet Manager', 400);
        }

        if(!userResult.rows[0].is_active) {
            return error(res, 'Cannot assign a deactivated user', 400);
        }

        const existingResult = await pool.query(
            'SELECT fleet_manager_id FROM fleet_manager_assignments WHERE fleet_group_id = $1', [fleetGroupId]
        );

        if(existingResult.rows.length > 0) {
            return error(res, 'This fleet group already has a manager assigned.', 409)
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

async function listMyFleetGroups(req, res){
    try{
        if(req.fleetGroupIds !== null && req.fleetGroupIds.length === 0){
            return success(res, {groups: []}, 200);
        }

        const result = await pool.query(`
            SELECT fg.id, fg.name, fg.description,
            COUNT(DISTINCT v.vehicle_id) AS vehicle_count
            FROM fleet_groups fg
            LEFT JOIN vehicles v ON fleet_group_id = fg.id
            WHERE ($1::bigint[] IS NULL OR fg.id = ANY($1::bigint[]))
            GROUP BY fg.id, fg.name, fg.description
            ORDER BY fg.name ASC
            `, [req.fleetGroupIds]);

        const groups = result.rows.map((row) => ({
            ...row,
            vehicle_count: Number.parseInt(row.vehicle_count, 10),
        }));

        return success(res, {groups}, 200);
    } catch (err) {
        const errorMessage = err.message || 'Failed to fetch your fleet groups';
        console.error('List my fleet groups error:', err);
        return error(res, 'Failed to fetch your fleet groups: ' + errorMessage, 500);
    }
}

async function listVehiclesForAssignment(req, res) {
    const {id: fleetGroupId} = req.params;
    const {status = 'unassigned', search, page=1, limit =20} = req.query;
    const offset = (Number.parseInt(page) - 1) *Number.parseInt(limit);
    const allowed_statuses = ['unassigned', 'in_group', 'other'];

    if(!allowed_statuses.includes(status)){
        return error(res, `status must be one of: ${allowed_statuses.join(', ')}`,400);

    }

    try {
        const groupResult = await pool.query('SELECT id FROM fleet_groups WHERE id = $1', [fleetGroupId]);

        if(groupResult.rows.length === 0){
            return error(res, 'Fleet group not found', 404);
        }


        let statusClause;
        const baseParams = [];

        if(status === 'unassigned'){
            statusClause = 'v.fleet_group_id IS NULL';
        }else if(status === 'in_group'){
            statusClause = 'v.fleet_group_id = $1';
            baseParams.push(fleetGroupId);
        }else{
            statusClause = 'v.fleet_group_id IS NOT NULL AND v.fleet_group_id != $1';
            baseParams.push(fleetGroupId);
        }

        let paramCount = baseParams.length +1;
        let searchClause = '';
        const searchParams = [];

        if(search) {
            searchClause = ` AND v.vehicle_id ILIKE $${paramCount}`;
            searchParams.push(`%${search}%`);
            paramCount++;
        }


        const countResult = await pool.query(
            `SELECT COUNT(*) FROM vehicles v WHERE ${statusClause}${searchClause}`,
            [...baseParams, ...searchParams]
        );


        const rowsResult = await pool.query(
            `SELECT v.vehicle_id AS id, v.fleet_group_id, fg.name AS fleet_group_name
            FROM vehicles v
            LEFT JOIN fleet_groups fg ON fg.id = v.fleet_group_id
            WHERE ${statusClause}${searchClause}
            ORDER BY v.vehicle_id
            LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
            [...baseParams, ...searchParams, Number.parseInt(limit), offset]
        );

        return success(res, {
            vehicles: rowsResult.rows,
            total: Number.parseInt(countResult.rows[0].count, 10),
            page: Number.parseInt(page),
            limit: Number.parseInt(limit),
        }, 200);
    }catch (err){
        console.error('List vehicles for assignment error:', err);
        return error(res, 'Failed to list vehicles for assignment: ' + err.message, 500);
    }
}


module.exports = {createFleetGroup, listFleetGroups, assignFleetManager, removeFleetManagerAssignment, bulkAssignVehiclesToGroup, listMyFleetGroups, listVehiclesForAssignment};
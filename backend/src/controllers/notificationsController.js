const {pool} = require('../db/pool');
const {success, error} = require('../utils/response');

async function getNotifications(req, res) {
    const sinceParam = req.query.since;
    const since = sinceParam ? new Date(sinceParam) : new Date();

    if(Number.isNaN(since.getTime())){
        return error(res, 'Invalid since parameter', 400);
    }


    try{
        const result = await pool.query(`
            SELECT fal.id, fal.action, fal.performed_at, fg.name AS fleet_group_name
            FROM fleet_assignment_audit_log fal
            JOIN fleet_groups fg ON fg.id = fal.fleet_group_id
            WHERE fal.fleet_manager_id = $1
                AND fal.performed_at >$2
            ORDER BY fal.performed_at ASC
            `, [req.user.id, since]
        );

        const notifications = result.rows.map((row) => ({
            id: row.id,
            action:row.action,
            fleet_group_name: row.fleet_group_name,
            performed_at: row.performed_at,
            message: row.action === 'ASSIGNED'
                ? `You have been added to Fleet Group: ${row.fleet_group_name}`
                : `You no longer have access to Fleet Group: ${row.fleet_group_name}`,
        }));

        return success(res, {
            notifications, 
            checked_at: new Date().toISOString(),
        }, 200);
    }catch (err) {
        console.error('Get notifications error:', err);
        return error(res, 'Failed to fetch notifications: ' + err.message, 500);
    }
}

module.exports = {getNotifications};
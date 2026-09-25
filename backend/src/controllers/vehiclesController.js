const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');

// Helper to validate query date parameters
const isValidDate = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !Number.isNaN(d.getTime());
};

/**
 * Confirms vehicle exists and belongs to one of the caller's allowed fleet groups.
 */
async function vehicleIsAccessible(vehicleId, fleetGroupIds) {
    const result = await pool.query(
        `SELECT 1 FROM vehicles
         WHERE vehicle_id = $1
           AND ($2::bigint[] IS NULL OR fleet_group_id = ANY($2::bigint[]))`,
        [vehicleId, fleetGroupIds]
    );

    return result.rows.length > 0;
}

async function getVehicleSafetyTrend(req, res) {
    const { vehicleId } = req.params;
    const { days = 7 } = req.query;

    if (!vehicleId) {
        return error(res, 'Vehicle ID is required', 400);
    }

    const parsedVehicleId = Number.parseInt(vehicleId, 10);
    if (Number.isNaN(parsedVehicleId)) {
        return error(res, 'Invalid vehicle ID format', 400);
    }

    const parsedDays = Number.parseInt(days, 10);
    const daysInt = Number.isNaN(parsedDays) ? 7 : Math.max(1, Math.min(parsedDays, 365));

    try {
        if (!(await vehicleIsAccessible(parsedVehicleId, req.fleetGroupIds))) {
            return error(res, 'Vehicle not found or access denied', 404);
        }

        // Use parameterized multiplication instead of SQL string interpolation
        const result = await pool.query(
            `SELECT 
                score_date as date,
                safety_score,
                harsh_brakes,
                harsh_accelerations,
                harsh_cornering,
                crashes,
                total_events,
                classification
             FROM driver_daily_safety_scores
             WHERE vehicle_id = $1
               AND score_date >= CURRENT_DATE - ($2::integer * INTERVAL '1 day')
             ORDER BY score_date ASC`,
            [parsedVehicleId, daysInt]
        );

        const avgScore = result.rows.length > 0
            ? result.rows.reduce((sum, r) => sum + (Number.parseFloat(r.safety_score) || 0), 0) / result.rows.length
            : 0;

        return success(res, {
            vehicle_id: parsedVehicleId,
            trend: result.rows,
            average_score: Math.round(avgScore),
            total_days: result.rows.length
        }, 200);
    } catch (err) {
        console.error('Get vehicle safety trend error:', err);
        return error(res, 'Failed to fetch safety trend', 500);
    }
}

async function getVehicleTrips(req, res) {
    const { vehicleId } = req.params;
    const { limit = 10, before } = req.query;

    if (!vehicleId) {
        return error(res, 'Vehicle ID is required', 400);
    }

    const parsedVehicleId = Number.parseInt(vehicleId, 10);
    if (Number.isNaN(parsedVehicleId)) {
        return error(res, 'Invalid vehicle ID format', 400);
    }

    const parsedLimit = Number.parseInt(limit, 10);
    const limitInt = Number.isNaN(parsedLimit) ? 10 : Math.max(1, Math.min(parsedLimit, 100));

    if (before && !isValidDate(before)) {
        return error(res, "Invalid 'before' date parameter format", 400);
    }

    try {
        if (!(await vehicleIsAccessible(parsedVehicleId, req.fleetGroupIds))) {
            return error(res, 'Vehicle not found or access denied', 404);
        }

        const result = await pool.query(
            `SELECT 
                trip_id,
                start_time,
                end_time,
                distance_km,
                safety_score,
                harsh_brakes,
                harsh_accelerations,
                harsh_cornering
             FROM get_trip_history_with_events($1, NULL, NULL, $2, $3)`,
            [parsedVehicleId, before || null, limitInt]
        );

        const statsResult = await pool.query(
            `SELECT 
                COALESCE(AVG(safety_score), 0) as avg_safety_score,
                COALESCE(SUM(distance_km), 0) as total_distance,
                COALESCE(COUNT(*), 0) as total_trips
             FROM get_trip_history_with_events($1, NULL, NULL, NULL, NULL)`,
            [parsedVehicleId]
        );

        const stats = statsResult.rows[0];

        return success(res, {
            vehicle_id: parsedVehicleId,
            trips: result.rows.map(row => ({
                id: row.trip_id,
                date: row.start_time,
                start_time: row.start_time,
                end_time: row.end_time,
                distance: row.distance_km !== null ? Number.parseFloat(row.distance_km) : 0,
                safety_score: row.safety_score !== null ? Number.parseInt(row.safety_score, 10) : null,
                harsh_brakes: row.harsh_brakes !== null ? Number.parseInt(row.harsh_brakes, 10) : 0,
                harsh_accelerations: row.harsh_accelerations !== null ? Number.parseInt(row.harsh_accelerations, 10) : 0,
                harsh_cornering: row.harsh_cornering !== null ? Number.parseInt(row.harsh_cornering, 10) : 0
            })),
            stats: {
                safety_rating: Math.round(Number.parseFloat(stats.avg_safety_score) || 0),
                total_distance: Number.parseFloat(stats.total_distance) || 0,
                trips_recorded: Number.parseInt(stats.total_trips, 10) || 0
            }
        }, 200);
    } catch (err) {
        console.error('Get vehicle trips error:', err);
        return error(res, 'Failed to fetch trips', 500);
    }
}

module.exports = {
    vehicleIsAccessible,
    getVehicleSafetyTrend,
    getVehicleTrips
};
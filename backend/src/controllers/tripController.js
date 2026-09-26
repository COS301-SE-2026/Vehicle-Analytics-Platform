const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');

// Helper to sanitize fleet group array passed down from auth middleware
const getFleetGroupParam = (fleetGroupIds) => {
    return Array.isArray(fleetGroupIds) && fleetGroupIds.length > 0
        ? fleetGroupIds
        : null;
};

// Helper to validate provided query date parameters
const isValidDate = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !Number.isNaN(d.getTime());
};

/**
 * Get trip history for a vehicle
 * GET /api/trips/vehicle/:vehicleId
 */
async function getTripHistory(req, res) {
    const { vehicleId } = req.params;
    const { limit = 50, before } = req.query;

    if (!vehicleId) {
        return error(res, 'Vehicle ID is required', 400);
    }

    const parsedVehicleId = Number.parseInt(vehicleId, 10);
    if (Number.isNaN(parsedVehicleId)) {
        return error(res, 'Invalid vehicle ID format', 400);
    }

    // Clamp limit to safe range (1-100) to prevent resource exhaustion
    const parsedLimit = Number.parseInt(limit, 10);
    const limitInt = Number.isNaN(parsedLimit) ? 50 : Math.max(1, Math.min(parsedLimit, 100));

    if (before && !isValidDate(before)) {
        return error(res, "Invalid 'before' date parameter format", 400);
    }

    const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

    try {
        // Multi-tenant authorization check
        if (fleetGroupIds) {
            const accessCheck = await pool.query(
                `SELECT 1 FROM vehicles
                 WHERE vehicle_id = $1
                   AND fleet_group_id = ANY($2::bigint[])`,
                [parsedVehicleId, fleetGroupIds]
            );

            if (accessCheck.rows.length === 0) {
                return error(res, 'Vehicle not found or access denied', 404);
            }
        }

        const result = await pool.query(
            `SELECT 
                trip_id, vehicle_id, start_time, end_time, 
                distance_km, avg_speed_kmh, max_speed_kmh,
                status, safety_score
             FROM get_trip_history($1, NULL, NULL, $2, $3)`,
            [parsedVehicleId, before || null, limitInt]
        );

        const trips = result.rows.map(row => ({
            trip_id: row.trip_id,
            vehicle_id: row.vehicle_id,
            start_time: row.start_time,
            end_time: row.end_time,
            distance_km: row.distance_km !== null ? Number.parseFloat(row.distance_km) : 0,
            avg_speed_kmh: row.avg_speed_kmh !== null ? Number.parseFloat(row.avg_speed_kmh) : 0,
            max_speed_kmh: row.max_speed_kmh !== null ? Number.parseFloat(row.max_speed_kmh) : 0,
            status: row.status,
            safety_score: row.safety_score !== null ? Number.parseInt(row.safety_score, 10) : null
        }));

        return success(res, {
            vehicle_id: parsedVehicleId,
            total: trips.length,
            trips
        }, 200);
    } catch (err) {
        console.error('Get trip history error:', err);
        return error(res, 'An internal error occurred while fetching trip history', 500);
    }
}

/**
 * Get trip replay data including points and safety events
 * GET /api/trips/:tripId/replay
 */
async function getTripReplay(req, res) {
    const { tripId } = req.params;

    if (!tripId) {
        return error(res, 'Trip ID is required', 400);
    }

    const parsedTripId = Number.parseInt(tripId, 10);
    if (Number.isNaN(parsedTripId)) {
        return error(res, 'Invalid trip ID format', 400);
    }

    const fleetGroupIds = getFleetGroupParam(req.fleetGroupIds);

    try {
        // Fetch trip and verify tenant authorization via vehicle fleet association
        const tripResult = await pool.query(
            `SELECT t.vehicle_id, t.start_time, t.end_time, t.distance_km, 
                    t.avg_speed_kmh, t.max_speed_kmh, t.safety_score
             FROM trips t
             JOIN vehicles v ON v.vehicle_id = t.vehicle_id
             WHERE t.trip_id = $1 
               AND t.status = 'completed'
               AND ($2::bigint[] IS NULL OR v.fleet_group_id = ANY($2::bigint[]))`,
            [parsedTripId, fleetGroupIds]
        );

        if (tripResult.rows.length === 0) {
            return error(res, 'Trip not found or access denied', 404);
        }

        const trip = tripResult.rows[0];

        const pointsResult = await pool.query(
            `SELECT * FROM get_trip_replay($1)`,
            [parsedTripId]
        );

        const eventsResult = await pool.query(
            `SELECT time, event_detail as type, event_category, latitude, longitude, speed
             FROM vehicle_events 
             WHERE vehicle_id = $1
               AND time BETWEEN $2 AND COALESCE($3, NOW())
               AND event_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering', 'speeding')
             ORDER BY time ASC`,
            [trip.vehicle_id, trip.start_time, trip.end_time]
        );

        const points = pointsResult.rows.map(row => {
            let colour = 'green';
            const speed = Number.parseFloat(row.speed_kmh) || 0;
            if (speed > 80) colour = 'red';
            else if (speed > 60) colour = 'amber';

            return {
                time: row.point_time,
                latitude: Number.parseFloat(row.latitude),
                longitude: Number.parseFloat(row.longitude),
                speed: speed,
                colour: colour
            };
        });

        const events = eventsResult.rows.map(row => ({
            time: row.time,
            type: row.type,
            category: row.event_category,
            latitude: Number.parseFloat(row.latitude),
            longitude: Number.parseFloat(row.longitude),
            speed: row.speed !== null ? Number.parseFloat(row.speed) : 0
        }));

        return success(res, {
            trip: {
                trip_id: parsedTripId,
                vehicle_id: trip.vehicle_id,
                start_time: trip.start_time,
                end_time: trip.end_time,
                distance_km: trip.distance_km !== null ? Number.parseFloat(trip.distance_km) : 0,
                avg_speed_kmh: trip.avg_speed_kmh !== null ? Number.parseFloat(trip.avg_speed_kmh) : 0,
                max_speed_kmh: trip.max_speed_kmh !== null ? Number.parseFloat(trip.max_speed_kmh) : 0,
                safety_score: trip.safety_score !== null ? Number.parseInt(trip.safety_score, 10) : null
            },
            points,
            events
        }, 200);
    } catch (err) {
        console.error('Get trip replay error:', err);
        return error(res, 'An internal error occurred while fetching trip replay', 500);
    }
}

module.exports = {
    getTripHistory,
    getTripReplay
};
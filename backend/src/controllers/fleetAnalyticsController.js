const {pool} = require('../db/pool');

const {success, error} = require('../utils/response');

async function getFleetAnalytics(req, res) {
    const {period='day'} = req.query;
    const normalizedPeriod = period === 'week' ? 'week' : 'day';

    try {
        const interval = normalizedPeriod === 'week' ? '7 days' : '1 day';

        const trendResult = await pool.query(`
            SELECT score_date AS bucket, AVG(safety_score) AS avg_score, COUNT(*) AS vehicle_count
            FROM driver_daily_safety_scores
            WHERE score_date >= CURRENT_DATE - INTERVAL '${interval}'
            GROUP BY score_date
            ORDER BY score_date ASC
        `);

        const rankedResult = await pool.query(`
            SELECT
                vehicle_id,
                AVG(safety_score) AS avg_score,
                SUM(harsh_brakes) AS harsh_brakes,
                SUM(harsh_accelerations) AS harsh_accelerations,
                SUM(harsh_cornering) AS harsh_cornering,
                SUM(crashes) AS crashes,
                COUNT(*) AS days_count
            FROM driver_daily_safety_scores
            WHERE score_date >= CURRENT_DATE - INTERVAL '${interval}'
            GROUP BY vehicle_id
            ORDER BY avg_score ASC
        `);

        const eventBreakdownResult = await pool.query(`
            SELECT
                event_detail,
                COUNT(*) AS event_count
            FROM vehicle_events
            WHERE DATE(time) >= CURRENT_DATE - INTERVAL '${interval}'
              AND event_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering', 'speeding')
            GROUP BY event_detail
            ORDER BY event_count DESC
        `);

        const contributionResult = await pool.query(`
            SELECT
                vehicle_id,
                COUNT(*) AS total_events,
                COUNT(*) FILTER (WHERE event_detail = 'harsh_braking') AS harsh_brakes,
                COUNT(*) FILTER (WHERE event_detail = 'harsh_acceleration') AS harsh_accelerations,
                COUNT(*) FILTER (WHERE event_detail = 'harsh_cornering') AS harsh_cornering
            FROM vehicle_events
            WHERE DATE(time) >= CURRENT_DATE - INTERVAL '${interval}'
              AND event_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering', 'speeding')
            GROUP BY vehicle_id
            ORDER BY total_events DESC
        `);

        return success(res, {
            period: normalizedPeriod,
            trend: trendResult.rows.map(row => ({
                date: row.bucket || row.score_date,
                avg_score: Number.parseFloat(row.avg_score) || 0,
                vehicle_count: Number.parseInt(row.vehicle_count, 10) || 0,
            })),
            ranked_vehicles: rankedResult.rows.map(row => ({
                vehicle_id: row.vehicle_id,
                avg_score: Number.parseFloat(row.avg_score) || 0,
                harsh_brakes: Number.parseInt(row.harsh_brakes, 10) || 0,
                harsh_accelerations: Number.parseInt(row.harsh_accelerations, 10) || 0,
                harsh_cornering: Number.parseInt(row.harsh_cornering, 10) || 0,
                crashes: Number.parseInt(row.crashes, 10) || 0,
                days_count: Number.parseInt(row.days_count, 10) || 0,
            })),
            event_breakdown: eventBreakdownResult.rows.map(row => ({
                type: row.event_detail,
                count: Number.parseInt(row.event_count, 10) || 0,
            })),
            vehicle_contributions: contributionResult.rows.map(row => ({
                vehicle_id: row.vehicle_id,
                total_events: Number.parseInt(row.total_events, 10) || 0,
                harsh_brakes: Number.parseInt(row.harsh_brakes, 10) || 0,
                harsh_accelerations: Number.parseInt(row.harsh_accelerations, 10) || 0,
                harsh_cornering: Number.parseInt(row.harsh_cornering, 10) || 0,
            })),
        }, 200);
    } catch (err) {
        console.error('Get fleet analytics error:', err);
        return error(res, 'Failed to fetch fleet analytics: ' + err.message, 500);
    }
}

async function getVehicleDailyScores(req, res) {
    const {vehicleId} = req.params;
    const {days=7} = req.query;

    if (!vehicleId) {
        return error(res, 'Vehicle ID is required', 400);
    }

    try {
        const result = await pool.query(`
            SELECT
                score_date,
                safety_score,
                harsh_brakes,
                harsh_accelerations,
                harsh_cornering,
                crashes,
                total_events,
                classification
            FROM driver_daily_safety_scores
            WHERE vehicle_id = $1 AND score_date >= CURRENT_DATE - INTERVAL '${parseInt(days, 10)} days'
            ORDER BY score_date DESC
        `, [vehicleId]);

        return success(res, {
            vehicle_id: vehicleId,
            days: Number.parseInt(days, 10),
            scores: result.rows.map(row => ({
                date: row.score_date,
                safety_score: Number.parseInt(row.safety_score, 10) || 0,
                harsh_brakes: Number.parseInt(row.harsh_brakes, 10) || 0,
                harsh_accelerations: Number.parseInt(row.harsh_accelerations, 10) || 0,
                harsh_cornering: Number.parseInt(row.harsh_cornering, 10) || 0,
                crashes: Number.parseInt(row.crashes, 10) || 0,
                total_events: Number.parseInt(row.total_events, 10) || 0,
                classification: row.classification || 'Good',
            })),
        }, 200);
    } catch (err) {
        console.error('Get vehicle daily scores error:', err);
        return error(res, 'Failed to fetch vehicle scores: ' + err.message, 500);
    }
}

module.exports = { getFleetAnalytics, getVehicleDailyScores };

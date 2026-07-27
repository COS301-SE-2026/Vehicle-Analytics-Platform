


const {pool} = require('../db/pool');

const {success, error} = require('../utils/response');



async function getVehicleSafetyTrend(req, res) {


    const {vehicleId} = req.params;


    const {period = 'day', days = 7} = req.query;






    try {

        const result = await pool.query(`

            SELECT 

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

              AND score_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'

            ORDER BY score_date ASC

        `, [vehicleId]);



        const avgScore = result.rows.reduce((sum, r) => sum + (r.safety_score || 0), 0) / (result.rows.length || 1);



        return success(res, {

            vehicle_id: vehicleId,


            trend: result.rows,

            average_score: Math.round(avgScore),

            total_days: result.rows.length

        }, 200);

    } catch (err) {

        console.error('Get vehicle safety trend error:', err);

        return error(res, 'Failed to fetch safety trend: ' + err.message, 500);

    }

}



async function getVehicleTrips(req, res) {

    const {vehicleId} = req.params;

    const {limit = 10, before} = req.query;



    try {

        const result = await pool.query(`

            SELECT 

                trip_id,

                start_time,

                end_time,

                distance_km,

                safety_score

            FROM get_trip_history_with_events($1, NULL, NULL, $2, $3)


        `, [vehicleId, before || null, parseInt(limit)]);



        const statsResult = await pool.query(`


            SELECT 
                COALESCE(AVG(t.safety_score), 0) as avg_safety_score,

                COALESCE(SUM(t.distance_km), 0) as total_distance,

                COALESCE(COUNT(*), 0) as total_trips,

                COALESCE(COUNT(DISTINCT DATE(t.start_time)), 0) as active_days,

                COALESCE(

                    (SELECT COUNT(*) 

                     FROM vehicle_events ve 

                     WHERE ve.vehicle_id = $1 

                       AND ve.event_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering')

                       AND ve.time BETWEEN COALESCE(MIN(t.start_time), NOW()) AND COALESCE(MAX(t.end_time), NOW())

                    ) / NULLIF(SUM(t.distance_km), 0) * 100, 0

                ) as incidents_per_100km

            FROM trips t

            WHERE t.vehicle_id = $1

              AND t.status = 'completed'

        `, [vehicleId]);



        return success(res, {

            vehicle_id: vehicleId,

            trips: result.rows.map(row => ({


                id: row.trip_id,

                date: row.start_time,

                start_time: row.start_time,

                end_time: row.end_time,

                distance: row.distance_km,

                safety_score: row.safety_score


            })),

            stats: {


                safety_rating: Math.round(statsResult.rows[0].avg_safety_score || 0),

                total_distance: statsResult.rows[0].total_distance || 0,





                trips_recorded: statsResult.rows[0].total_trips || 0,

                active_days: statsResult.rows[0].active_days || 0,

                incidents_per_100km: parseFloat(statsResult.rows[0].incidents_per_100km || 0).toFixed(1)

            }

        }, 200);

    }

 catch (err) {

        console.error('Get vehicle trips error:', err);



        return error(res, 'Failed to fetch trips: ' + err.message, 500);

    }

}




module.exports = { getVehicleSafetyTrend, getVehicleTrips };


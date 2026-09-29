


const {pool} = require('../db/pool');

const {success, error} = require('../utils/response');





async function getTripHistory(req, res) {



    const {vehicleId} = req.params;



    const {limit=50, before} = req.query;







    if(!vehicleId){



        return error(res, 'Vehicle ID is required', 400);



    }




    try{



        const result = await pool.query(



            `SELECT 



                trip_id, vehicle_id, start_time, end_time, 


                distance_km, avg_speed_kmh, max_speed_kmh,



                status, safety_score



             FROM get_trip_history($1, NULL, NULL, $2, $3)`,



            [vehicleId, before || null, parseInt(limit)]



        );






        return success(res, {



        

    vehicle_id: vehicleId,



            total: result.rows.length,




            trips: result.rows.map(row => ({




                trip_id: row.trip_id,



                vehicle_id: row.vehicle_id,



                start_time: row.start_time,



                end_time: row.end_time,



                distance_km: row.distance_km,



                avg_speed_kmh: row.avg_speed_kmh,



                max_speed_kmh: row.max_speed_kmh,




                status: row.status,



                safety_score: row.safety_score !== null ? parseInt(row.safety_score) : null



            }))



        }, 200);



    } 


catch (err){






        console.error('Get trip history error:', err);



        return error(res, 'Failed to fetch trip history: '+err.message, 500);



    }

}







async function getTripReplay(req, res) {

    const {tripId} = req.params;



   
 if(!tripId){



        return error(res, 'Trip ID is required', 400);



    }







    try{



        const tripResult = await pool.query(`



            SELECT vehicle_id, start_time, end_time, distance_km, avg_speed_kmh, max_speed_kmh, safety_score



            FROM trips




            WHERE trip_id = $1 AND status = 'completed'

        `, [tripId]);



        if(tripResult.rows.length===0){




            return error(res, 'Trip not found or not completed', 404);



        }




        const trip = tripResult.rows[0];




      
const MAX_REPLAY_POINTS = 2000;
const RAW_REPLAY_MAX_SECONDS = 2*60*60;
const tripEnd = trip.end_time ? new Date(trip.end_time) : new Date();
const durationSeconds = (tripEnd - new Date(trip.start_time)) /1000;

let pointsResult;
    if(durationSeconds <= RAW_REPLAY_MAX_SECONDS) {
        pointsResult = await pool.query(
            `SELECT * FROM get_trip_replay($1)`,
            [tripId]
        );
    }else {
        const stepSeconds = Math.max(60, Math.ceil(durationSeconds / MAX_REPLAY_POINTS));

        pointsResult = await pool.query(`
                SELECT time_bucket($4::interval, bucket) AS point_time,
                       first(latitude, bucket)            AS latitude,
                       first(longitude, bucket)           AS longitude,
                       max(max_speed)                     AS speed_kmh
                FROM vehicle_speed_1min
                WHERE vehicle_id = $1
                  AND bucket BETWEEN $2 AND $3
                  AND latitude IS NOT NULL
                GROUP BY 1
                ORDER BY 1
            `, [trip.vehicle_id, trip.start_time, tripEnd, `${stepSeconds} seconds`]);
        }



        const eventsResult = await pool.query(`



            SELECT time, event_detail as type, event_category, latitude, longitude, speed



            FROM vehicle_events WHERE vehicle_id = $1



              AND time BETWEEN $2 AND COALESCE($3, NOW())



              AND event_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering', 'speeding')



            ORDER BY time ASC



        `, [trip.vehicle_id, trip.start_time, trip.end_time]);







        const points = pointsResult.rows.map(row => {



            let colour = 'green';



            if(row.speed_kmh>80) colour = 'red';



            else if(row.speed_kmh>60) colour = 'amber';





            return{



                time: row.point_time,

                latitude: parseFloat(row.latitude),

                longitude: parseFloat(row.longitude),

                speed: row.speed_kmh,

                colour: colour

            };

        });



        return success(res, {

            trip: {



                trip_id: parseInt(tripId),



                vehicle_id: trip.vehicle_id,


                start_time: trip.start_time,


                end_time: trip.end_time,



                distance_km: trip.distance_km,



                avg_speed_kmh: trip.avg_speed_kmh,



                max_speed_kmh: trip.max_speed_kmh,





                safety_score: trip.safety_score !== null ? parseInt(trip.safety_score) : null



            },




            points: points,

            events: eventsResult.rows.map(row => ({

                time: row.time,

                type: row.type,


                category: row.event_category,

                latitude: parseFloat(row.latitude),

                longitude: parseFloat(row.longitude),

                speed: row.speed

            }))

        }, 200);



    } 


catch (err){




        console.error('Get trip replay error:', err);

        return error(res, 'Failed to fetch trip replay: '+err.message, 500);




    }

}






module.exports = {getTripHistory, getTripReplay};



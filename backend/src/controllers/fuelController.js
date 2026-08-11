

const {pool} = require('../db/pool');


const {success, error} = require('../utils/response');


const {calculateFuelForTrip} = require('../utils/fuelCalculations');




async function getVehicleFuelStats(req, res) {


    const {vehicleId} = req.params;


    const {days = 30} = req.query;



    try{


        const result = await pool.query(

            `

            SELECT 

                trip_id,

                trip_date,

                total_distance_km,

                avg_speed_kmh,

                estimated_fuel_consumed_liters,

                fuel_efficiency_km_per_liter,





 
               fuel_efficiency_l_per_100km,

                road_breakdown

            FROM trip_fuel_efficiency

            WHERE vehicle_id = $1

              AND trip_date >= NOW() - INTERVAL '${days} days'

            ORDER BY trip_date DESC

            `,

            [vehicleId]

        );



        const summary = {

            total_distance: 0,

            total_fuel: 0,

            avg_efficiency: 0,

            trip_count: result.rows.length,

            road_breakdown: {}

        };



        let totalEff = 0;

        for (const row of result.rows) {

            summary.total_distance += parseFloat(row.total_distance_km) || 0;

            summary.total_fuel += parseFloat(row.estimated_fuel_consumed_liters) || 0;

            totalEff += parseFloat(row.fuel_efficiency_km_per_liter) || 0;



            if (row.road_breakdown) {

                for (const [road, dist] of Object.entries(row.road_breakdown)) {

                    summary.road_breakdown[road] = (summary.road_breakdown[road] || 0) + dist;

                }

            }

        }

        summary.avg_efficiency = result.rows.length > 0 ? Math.round((totalEff / result.rows.length) * 100) / 100 : 0;



        return success(res, {

            vehicle_id: vehicleId,

            summary,

            trips: result.rows

        }, 200);

    } catch (err) {

        console.error('Get vehicle fuel stats error:', err);

        return error(res, 'Failed to fetch fuel statistics', 500);

    }

}







async function getFleetFuelSummary(req, res) {



    const { period = 'week' } = req.query;

    const interval = period === 'day' ? '1 day' : period === 'week' ? '7 days' : '30 days';



    try {

        const result = await pool.query(

            `

            SELECT 

                vehicle_id,

                COUNT(*) as trip_count,

                SUM(total_distance_km) as total_distance_km,

                SUM(estimated_fuel_consumed_liters) as total_fuel_liters,

                AVG(fuel_efficiency_km_per_liter) as avg_efficiency_km_per_l

            FROM trip_fuel_efficiency

            WHERE trip_date >= NOW() - INTERVAL '${interval}'

            GROUP BY vehicle_id

            ORDER BY avg_efficiency_km_per_l DESC

            `

        );



        const totalResult = await pool.query(

            `

            SELECT 

                COUNT(DISTINCT vehicle_id) as vehicles_tracked,

                SUM(estimated_fuel_consumed_liters) as total_fuel,

                SUM(total_distance_km) as total_distance

            FROM trip_fuel_efficiency

            WHERE trip_date >= NOW() - INTERVAL '${interval}'

            `

        );



        return success(res, {

            period,

            fleet_total: totalResult.rows[0] || { vehicles_tracked: 0, total_fuel: 0, total_distance: 0 },

            vehicles: result.rows

        }, 200);

    } catch (err) {

        console.error('Get fleet fuel summary error:', err);

        return error(res, 'Failed to fetch fleet fuel summary', 500);

    }

}




async function getFuelDashboard(req, res) {

    try {

        const result = await pool.query(

            `

            SELECT 

                COALESCE(AVG(fuel_efficiency_km_per_liter), 0) as avg_fleet_efficiency,

                COALESCE(SUM(estimated_fuel_consumed_liters), 0) as total_fuel_today,

                COALESCE(SUM(total_distance_km), 0) as total_distance_today,

                COUNT(DISTINCT vehicle_id) as vehicles_tracked

            FROM trip_fuel_efficiency

            WHERE trip_date >= CURRENT_DATE

            `

        );



        return success(res, {

            avg_fleet_efficiency_km_l: parseFloat(result.rows[0].avg_fleet_efficiency) || 0,

            total_fuel_consumed_liters: parseFloat(result.rows[0].total_fuel_today) || 0,

            total_distance_km: parseFloat(result.rows[0].total_distance_today) || 0,

            vehicles_tracked: parseInt(result.rows[0].vehicles_tracked) || 0,

            last_updated: new Date().toISOString()

        }, 200);

    } catch (err) {

        console.error('Get fuel dashboard error:', err);

        return error(res, 'Failed to fetch fuel dashboard data', 500);

    }

}






async function calculateTripFuel(req, res) {

    const { tripId } = req.params;



    try {

        const result = await pool.query(

            `

            SELECT 

                t.trip_id,

                t.vehicle_id,

                t.start_time,

                t.end_time,

                ct.latitude,

                ct.longitude,

                ct.speed,

                ct.time,

                r.road_class,

                r.maxspeed_kmh

            FROM trips t

            JOIN clean_telemetry ct ON t.vehicle_id = ct.vehicle_id

                AND ct.time BETWEEN t.start_time AND t.end_time

            LEFT JOIN LATERAL (

                SELECT road_class, maxspeed_kmh

                FROM roads

                WHERE ST_DWithin(

                    geom,

                    ST_SetSRID(ST_MakePoint(ct.longitude, ct.latitude), 4326),

                    0.001

                )

                ORDER BY geom <-> ST_SetSRID(ST_MakePoint(ct.longitude, ct.latitude), 4326)

                LIMIT 1

            ) r ON true

            WHERE t.trip_id = $1

            ORDER BY ct.time

            `,

            [tripId]

        );



        if (result.rows.length === 0) {

            return error(res, 'Trip not found or no telemetry data', 404);

        }



        const points = result.rows;

        const vehicleId = points[0].vehicle_id;

        const tripDate = new Date(points[0].start_time).toISOString().split('T')[0];



        const fuelData = calculateFuelForTrip(points);



       




        const existing = await pool.query(

            'SELECT trip_id FROM trip_fuel_efficiency WHERE trip_id = $1',

            [tripId]

        );



        if (existing.rows.length > 0) {

           

            await pool.query(




                `



                UPDATE trip_fuel_efficiency SET



                    total_distance_km = $1,

                    avg_speed_kmh = $2,

                    estimated_fuel_consumed_liters = $3,

                    fuel_efficiency_km_per_liter = $4,

                    fuel_efficiency_l_per_100km = $5,

                    road_breakdown = $6,

                    updated_at = NOW()

                WHERE trip_id = $7

                `,

                [

                    fuelData.total_distance,

                    fuelData.avg_speed_kmh,

                    fuelData.total_fuel,

                    fuelData.efficiency_km_l,

                    fuelData.efficiency_l_100km,

                    JSON.stringify(fuelData.road_breakdown),

                    tripId

                ]

            );

        } else {

           
            await pool.query(

                `


                INSERT INTO trip_fuel_efficiency (


                    trip_id, vehicle_id, trip_date,

                    total_distance_km, avg_speed_kmh,

                    estimated_fuel_consumed_liters,

                    fuel_efficiency_km_per_liter,

                    fuel_efficiency_l_per_100km,

                    road_breakdown

                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)

                `,

                [

                    tripId,

                    vehicleId,

                    tripDate,

                    fuelData.total_distance,

                    fuelData.avg_speed_kmh,

                    fuelData.total_fuel,

                    fuelData.efficiency_km_l,

                    fuelData.efficiency_l_100km,

                    JSON.stringify(fuelData.road_breakdown)

                ]

            );

        }



        return success(res, {

            trip_id: tripId,

            ...fuelData

        }, 200);

    } catch (err) {

        console.error('Calculate trip fuel error:', err);

        return error(res, 'Failed to calculate trip fuel efficiency: ' + err.message, 500);

    }

}



module.exports = {

    getVehicleFuelStats,

    getFleetFuelSummary,

    getFuelDashboard,

    calculateTripFuel

};


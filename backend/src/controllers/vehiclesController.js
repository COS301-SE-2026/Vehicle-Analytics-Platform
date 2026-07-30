


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
    } 
    

    

    
    
    catch (err) {
    

        
        console.error('Get vehicle safety trend error:', err);
    
        
        return error(res, 'Failed to fetch safety trend: '+err.message, 500);
    
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
    
                safety_score,
                harsh_brakes,
                harsh_accelerations,
                harsh_cornering
    
                FROM get_trip_history_with_events($1, NULL, NULL, $2, $3)
    
                `, [vehicleId, before || null, parseInt(limit)]);

                
        const statsResult = await pool.query(`
            
            SELECT 
                COALESCE(AVG(safety_score), 0) as avg_safety_score,
            
            
                COALESCE(SUM(distance_km), 0) as total_distance,
            
            
                COALESCE(COUNT(*), 0) as total_trips
            
                FROM get_trip_history_with_events($1, NULL, NULL, NULL, NULL)
        `, [vehicleId]);




        
        return success(res, {
        
            vehicle_id: vehicleId,
        
            trips: result.rows.map(row => ({
        
        
          
          
                id: row.trip_id,
        

                
                date: row.start_time,
        

                
                start_time: row.start_time,
        

                
                end_time: row.end_time,
        

        

                
                distance: row.distance_km,
                
                safety_score: row.safety_score,
                harsh_brakes: row.harsh_brakes,
                harsh_accelerations: row.harsh_accelerations,
                harsh_cornering: row.harsh_cornering
        

            })),

        
        
        
            stats: {
        
                safety_rating: Math.round(statsResult.rows[0].avg_safety_score),
        
        
              
                total_distance: statsResult.rows[0].total_distance,
             
                
                
                trips_recorded: statsResult.rows[0].total_trips
        

        
            }
        }, 200);
    } 
    
    



    catch (err) {
    
        console.error('Get vehicle trips error:', err);
    



        return error(res, 'Failed to fetch trips: '+err.message, 500);
    
    }
}



module.exports = { getVehicleSafetyTrend, getVehicleTrips };

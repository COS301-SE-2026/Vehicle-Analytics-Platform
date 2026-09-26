


const {pool} = require('../db/pool');

const {success, error} = require('../utils/response');



async function getVehicleSafetyScore(req, res) {


    const {vehicleId} = req.params;

    const {date, start_date, end_date} = req.query;



    
   
    if(!vehicleId){
    
   
   
        return error(res, 'Vehicle ID is required', 400);
    
    }


    
    try{
        const accessCheck = await pool.query(`
            SELECT 1 FROM vehicles
            WHERE vehicle_id = $1
                AND ($2::bigint[] IS NULL OR fleet_group_id = ANY($2::bigint[]))
            `, [vehicleId, req.fleetGroupIds])

        if(accessCheck.rows.length === 0) {
            return error(res, 'Vehicle not found', 404);
        }
    
        let query = `
    
        SELECT 
    
        vehicle_id, score_date,
    
        safety_score, harsh_brakes,
    
        harsh_accelerations, harsh_cornering,
    
    
        crashes, total_events,
    
        classification
    
        FROM driver_daily_safety_scores
    
    
        WHERE vehicle_id = $1
        `;
    
        const params = [vehicleId];
    
        let paramCount = 2;


        
      
      
        if(start_date && end_date){
      
            

            query += ` AND score_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
        
            params.push(start_date, end_date);
        
            paramCount += 2;
        
        } 
        
        
        else if(date){

        


        

            
            query += ` AND score_date = $${paramCount}`;
        
            
            params.push(date);
        

            paramCount++;
        
        } 
        
        
        else{
        
        
            query += ` AND score_date = CURRENT_DATE`;
        
        }

        
        query += ` ORDER BY score_date DESC`;


        
        const result = await pool.query(query, params);


        
        if(!result.rows||result.rows.length === 0){
        
            return success(res, {
        
        
              
                vehicle_id: vehicleId,
              
              
                date: date || 'CURRENT_DATE',
        
        

                
                message: 'No safety data available for this date',
        

                
                safety_score: null,
        

                
                classification: 'No Data',
        


                scores: []
            }, 200);
        }


        
        const row = result.rows[0];
      
        
        
        const scores = result.rows.map(r => ({
        

        

            
            date: r.score_date,
        

            
            safety_score: r.safety_score !== null && r.safety_score !== undefined ? parseInt(r.safety_score) : null,
            
            harsh_brakes: parseInt(r.harsh_brakes) || 0,
        

        

            
            harsh_accelerations: parseInt(r.harsh_accelerations) || 0,
            
            harsh_cornering: parseInt(r.harsh_cornering) || 0,
        

            
            crashes: parseInt(r.crashes) || 0,
        

        

            
            
            total_events: parseInt(r.total_events) || 0,
        
            
            classification: r.classification || 'No Data'
        }));




        
        return success(res, {
        
        
           
            vehicle_id: row.vehicle_id,
        

            
            date: row.score_date,
        

            
            safety_score: row.safety_score !== null && row.safety_score !== undefined ? parseInt(row.safety_score) : null,
            
            harsh_brakes: parseInt(row.harsh_brakes)||0,
        

        

            
            harsh_accelerations: parseInt(row.harsh_accelerations)||0,
        

            
            
            harsh_cornering: parseInt(row.harsh_cornering)||0,
        

            crashes: parseInt(row.crashes)||0,
        
            total_events: parseInt(row.total_events)||0,
            classification: row.classification || 'No Data',
        
            scores: scores,
        
            total_days: scores.length



        }, 200);




    } 
    
    
    
    
    catch (err){

    


        
        
        
        console.error('Get safety score error:', err);
    

        
        
        return error(res, 'Failed to fetch safety score: ' + err.message, 500);
    
    }

}









async function getFleetSafetyScores(req, res) {


    
    const {date, start_date, end_date} = req.query;



    
    try{
    
    
        let query = `
    
        SELECT 
                dss.vehicle_id, dss.score_date,
    
                dss.safety_score, dss.harsh_brakes,
    
    
                dss.harsh_accelerations, dss.harsh_cornering,
    
                dss.crashes, dss.total_events,
                dss.classification
    
                FROM driver_daily_safety_scores dss
                JOIN vehicles v ON v.vehicle_id = dss.vehicle_id
    
                WHERE ($1::bigint[] IS NULL OR v.fleet_group_id = ANY($1::bigint[]))
    
    
                `;
        const params = [req.fleetGroupIds];
    
    
        let paramCount = 2;

    
    
       
       
        if(start_date&&end_date){
            query += ` AND score_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
    
    

            
            params.push(start_date, end_date);
            
            paramCount += 2;
    

    
        } 
        
        else if (date) {
        
            query += ` AND score_date = $${paramCount}`;
    

    

            
            
            params.push(date);
    


            
            paramCount++;
    
        } 
        
        
        else {
    

    

            
            query += ` AND score_date = (SELECT MAX(score_date) FROM driver_daily_safety_scores)`;
    


        }


        
        query += ` ORDER BY safety_score ASC`;


        
        const result = await pool.query(query, params);


        
        if(!result.rows||result.rows.length===0){

        

            
            return success(res, {
        

                
                
                date: date || 'latest',
        

                
                total_vehicles: 0,
        
                
                
                vehicles: []
            }, 200);
        }




       
        

        
        const vehicles = result.rows.map(row => ({
        
        
            vehicle_id: row.vehicle_id,
        

            
            date: row.score_date,
        

            
            safety_score: row.safety_score !== null && row.safety_score !== undefined ? parseInt(row.safety_score) : null,
        

        

            
            harsh_brakes: parseInt(row.harsh_brakes)||0,
        

            
            harsh_accelerations: parseInt(row.harsh_accelerations)||0,
            
            harsh_cornering: parseInt(row.harsh_cornering)||0,
        

            
            
            crashes: parseInt(row.crashes)||0,
        



        

            
            total_events: parseInt(row.total_events)||0,
            
            classification: row.classification || 'No Data'
        }));




        
        return success(res, {
        
            date: date || 'latest',
        
        
            total_vehicles: vehicles.length,
            vehicles: vehicles
        
        }, 200);

    } 
    
    
    catch (err) {
    
        console.error('Get fleet safety scores error:', err);
    
        return error(res, 'Failed to fetch fleet safety scores: ' + err.message, 500);
    
    }
}





function getClassification(score) {


    
    if(score===null || score===undefined) return 'No Data';


    
    if(score>=80) return 'Good';



    if(score>=50) return 'Fair';


    return 'Poor';

}




module.exports = {getVehicleSafetyScore, getFleetSafetyScores};

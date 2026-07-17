

const {pool} = require('../db/pool');


const {success, error} = require('../utils/response');










async function getVehicleSafetyScore(req, res) {


    
    
    const {vehicleId} = req.params;


    
    
    const {date} = req.query;



    if(!vehicleId){




        return error(res, 'Vehicle ID is required', 400);



    }




    try{



        const result = await pool.query(`




            SELECT 

                vehicle_id,



                score_date,





                safety_score,  harsh_brakes,



                harsh_accelerations,  harsh_cornering,



                crashes, total_events,




                classification

            FROM driver_daily_safety_scores



            WHERE vehicle_id = $1



              AND score_date = COALESCE($2::date, CURRENT_DATE)



        `, [vehicleId, date||null]);






        if(!result.rows||result.rows.length===0){


            return success(res, {

                vehicle_id: vehicleId,

                date: date||'CURRENT_DATE',

                message: 'No safety data available for this date',

                safety_score: 100,

                classification: 'Good'



            }, 200);

        }



        const row = result.rows[0];



        return success(res, {


            vehicle_id: row.vehicle_id,


            date: row.score_date,


            safety_score: row.safety_score!==null && row.safety_score!==undefined ? parseInt(row.safety_score) : 100,



            harsh_brakes: parseInt(row.harsh_brakes)||0,



            harsh_accelerations: parseInt(row.harsh_accelerations)||0, harsh_cornering: parseInt(row.harsh_cornering)||0,



            crashes: parseInt(row.crashes)||0,



            total_events: parseInt(row.total_events)||0, classification: row.classification||'Good'



        }, 200);








    } catch (err) {



        console.error('Get safety score error:', err);


        return error(res, 'Failed to fetch safety score: '+err.message, 500);



    }

}






async function getFleetSafetyScores(req, res) {



    const {date} = req.query;





    try{




        const result = await pool.query(`


            SELECT 


                vehicle_id,  score_date,



                safety_score, harsh_brakes,



                harsh_accelerations, harsh_cornering,



                crashes, total_events,



                classification FROM driver_daily_safety_scores



            WHERE score_date = COALESCE($1::date, CURRENT_DATE) ORDER BY safety_score ASC



        `, [date||null]);






        if(!result.rows||result.rows.length===0){

            
            return success(res, {


                
                date: date||'CURRENT_DATE',


                
                total_vehicles: 0,


                
                
                vehicles: []

            }, 200);

        }





        const vehicles = result.rows.map(row => ({


            vehicle_id: row.vehicle_id,





            safety_score: row.safety_score!==null && row.safety_score!==undefined ? parseInt(row.safety_score) : 100,



            harsh_brakes: parseInt(row.harsh_brakes)||0,  harsh_accelerations: parseInt(row.harsh_accelerations)||0,




            harsh_cornering: parseInt(row.harsh_cornering)||0, crashes: parseInt(row.crashes)||0,


            total_events: parseInt(row.total_events)||0, classification: row.classification||'Good'

        }));





        return success(res, {


            
            date: date||'CURRENT_DATE',


            
            total_vehicles: vehicles.length,


            
            vehicles: vehicles


        }, 200);



    } 
    
    catch (err){




        console.error('Get fleet safety scores error:', err);



        return error(res, 'Failed to fetch fleet safety scores: '+err.message, 500);



    }

}





function getClassification(score) {



    if(score>=80) return 'Good';



    if(score>=50) return 'Fair';



    return 'Poor';




}



module.exports = {getVehicleSafetyScore, getFleetSafetyScores};







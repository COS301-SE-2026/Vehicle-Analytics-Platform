


const {Pool} = require('pg');

require('dotenv').config();






const pool = new Pool({



    host: process.env.DB_HOST,



    port: Number.parseInt(process.env.DB_PORT || '6432', 10),



    database: process.env.DB_NAME,



    user: process.env.DB_USER,



    password: process.env.DB_PASSWORD,



    ssl: { rejectUnauthorized: false },



    max: 5,



});







async function updateSafetyScores() {



    const now = new Date();



    console.log(`Running safety score update at ${now.toISOString()}`);



    



    try {



        await pool.query('SELECT update_daily_safety_scores(CURRENT_DATE)');



        console.log('Updated today scores');



        



        await pool.query('SELECT update_daily_safety_scores(CURRENT_DATE - INTERVAL \'1 day\')');



        console.log('Updated yesterday scores');



        



        const stats = await pool.query(`



            SELECT 



                COUNT(*) as total_vehicles,



                ROUND(AVG(safety_score)::numeric, 1) as avg_score,



                MIN(safety_score) as min_score,



                MAX(safety_score) as max_score,



                COUNT(*) FILTER (WHERE classification = 'Good') as good,



                COUNT(*) FILTER (WHERE classification = 'Fair') as fair,




                COUNT(*) FILTER (WHERE classification = 'Poor') as poor



            FROM driver_daily_safety_scores




            WHERE score_date = CURRENT_DATE



        `);



        



        const s = stats.rows[0];



        console.log(`Vehicles: ${s.total_vehicles}`);



        console.log(`Avg Score: ${s.avg_score || 0}`);



        console.log(`Good: ${s.good || 0}, Fair: ${s.fair || 0}, Poor: ${s.poor || 0}`);


        


    }

 catch (err){



        console.error('Failed to update safety scores:', err.message);

    } 

finally{

        await pool.end();

    }

}





if(require.main===module){


    updateSafetyScores();



}



module.exports = {updateSafetyScores};






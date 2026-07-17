


const {pool} = require('../db/pool');


const {success, error} = require('../utils/response');





async function getLiveLocations(req, res) {



  try{



    const result = await pool.query(`

      SELECT

      v.vehicle_id as id, v.device_id,

      CASE WHEN cvp.last_update IS NULL THEN 'offline'

      WHEN cvp.last_update < NOW() AT TIME ZONE 'UTC' - INTERVAL '15 minutes' THEN 'offline'

      WHEN cvp.speed > 0 THEN 'active' WHEN cvp.movement = 'Movement On' THEN 'active'

      WHEN cvp.ignition = 'Ignition On' THEN 'idle' ELSE 'offline'

      END as status, cvp.latitude,

      cvp.longitude,  cvp.speed,

      cvp.total_odometer, cvp.ignition,

      cvp.movement,cvp.last_update,


      
      COALESCE(daily_sum.total_distance, 0) as distance_today
      
      FROM vehicles v
      
      LEFT JOIN current_vehicle_position cvp ON v.vehicle_id = cvp.id
      
      LEFT JOIN (
      
      SELECT
      
      vehicle_id,
      
      SUM(distance_km) as total_distance FROM vehicle_daily_distance


      WHERE bucket = date_trunc('day', NOW() AT TIME ZONE 'UTC') GROUP BY vehicle_id

      ) daily_sum ON v.vehicle_id = daily_sum.vehicle_id ORDER BY v.vehicle_id

      `);

      
    return success(res, {


      timestamp: new Date().toISOString(),



      count: result.rows.length,


      
      vehicles: result.rows,



    }, 200);

  } 
  
  
  catch (err){





    console.error('Get live locations error:', err);

    return error(res, `Database Crash Detail: ${err.message}. Code: ${err.code || 'None'}. Stack: ${err.stack}`, 500);





  }

}







async function getVehicleById(req, res) {


  
  const {vehicleId} = req.params;




  


  try{

  


    const vehicleResult = await pool.query(`


      SELECT

      v.vehicle_id as id, v.device_id,

      v.created_at, CASE

      WHEN cvp.last_update IS NULL THEN 'offline'

      WHEN cvp.last_update < NOW() - INTERVAL '15 minutes' THEN 'offline'

      WHEN cvp.movement = 'Movement On' THEN 'active'  WHEN cvp.ignition = 'Ignition On' THEN 'idle'

      WHEN cvp.speed > 0 THEN 'active'

      ELSE 'offline' END as status,

      cvp.latitude,

      cvp.longitude, cvp.speed,

      cvp.total_odometer,

      cvp.ignition,

      cvp.movement, cvp.last_update

      FROM vehicles v

      LEFT JOIN current_vehicle_position cvp ON v.vehicle_id = cvp.id

      WHERE v.vehicle_id = $1

      `, [vehicleId]);

      
    if(vehicleResult.rows.length===0){

     
     
      



      return error(res, 'Vehicle not found', 404);

    
    
    }


    



    const eventsResult = await pool.query(`
    
      SELECT
    
      event_detail as type,
    
      event_category,

      speed,

      latitude,

      longitude,

      time as timestamp


      FROM vehicle_events

      WHERE vehicle_id = $1

      ORDER BY time DESC

      LIMIT 20

      `, [vehicleId]);

      

      return success(res, {
      
        vehicle: vehicleResult.rows[0],


      recent_events: eventsResult.rows,



    }, 200);




  } 
  
  
  
  catch (err){

   

    console.error('Get vehicle by ID error:', err);


    
    return error(res, `Database Crash Detail: ${err.message}. Code: ${err.code || 'None'}. Stack: ${err.stack}`, 500);  }



  }

  




async function getVehiclePositionBuffer(req, res){


  try{



    const result = await pool.query(`

      SELECT 

      vehicle_id,

      time,

      latitude,

      longitude,

      speed,

      ignition,


      movement,

      total_odometer

      FROM clean_telemetry

      WHERE 

      measurement = 'avl'

      AND time >= (SELECT MAX(time) FROM clean_telemetry) - INTERVAL '30 seconds'

      ORDER BY vehicle_id, time;

      `);


      
      const bucket = {}




      for(const row of result.rows){




        
        if(!bucket[row.vehicle_id]){



          bucket[row.vehicle_id] = [];



        }




        bucket[row.vehicle_id].push({

          time: row.time,

          latitude: Number(row.latitude),

          longitude: Number(row.longitude),

          speed: row.speed,

          ignition: row.ignition,

         
         
          movement: row.movement,
         
          total_odometer: row.total_odometer


        })
        ;


      }


      
      return success(res, {
      
        timestamp: new Date().toISOString(),
      
      
        vehicles: bucket





      }, 200);

      
  }
  



  catch(err){


 
 
 
    console.error('Get vehicle position buffer error:', err);
 


    
    return error(res, `Database Crash Detail: ${err.message}. Code: ${err.code || 'None'}. Stack: ${err.stack}`, 500);
 

  }

}





module.exports = {getLiveLocations, getVehicleById, getVehiclePositionBuffer};



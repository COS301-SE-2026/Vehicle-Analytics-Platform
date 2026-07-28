


const {pool} = require('../db/pool');


const {success, error} = require('../utils/response');





async function getLiveLocations(req, res) {



  try{



    const result = await pool.query(`

      SELECT

      v.vehicle_id as id, v.device_id,

      get_vehicle_status(cvp.last_update, cvp.movemonet, cvp.speed) AS status

      cvp.latitude, cvp.longitude,
      cvp.speed, cvp.total_odometer,
      cvp.ignition, cvp.movement,
      cvp.last_update,

      vlc.road, vlc.road_class,
      vlc.route_number, vlc.speed_limit,
      vlc.suburb, vlc.city,
      vlc.province, vlc.country,
      vlc.display_name,

      
      COALESCE(daily_sum.total_distance, 0) as distance_today
      
      FROM vehicles v
      
      LEFT JOIN current_vehicle_position cvp ON v.vehicle_id = cvp.id
      
      LEFT JOIN vehicle_location_cacke vlc ON vlc.vehicle_id = v.vehicle_id

      LEFT JOIN vehicle_daily_distance daily

       ON daily.vehicle_id = v.vehicle_id

      AND daily.day = date_trunc('day', NOW() AT TIME ZONE 'UTC)
      
      ORDER BY v.vehicle_id; `);

      
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

      v.created_at, 
      
      get_vehicle_status(cvp.last_update, cvp.movement, cvp.speed) AS status,
      

      cvp.latitude,

      cvp.longitude, cvp.speed,

      cvp.total_odometer,

      cvp.ignition,

      cvp.movement, cvp.last_update

      vlc.road, vlc.road_class,

      vlc.route_number, vlc.speed_limit,

      vlc.suburb, vlc.city,

      vlc.province, vlc.country,

      vlc.display_name

      FROM vehicles v

      LEFT JOIN current_vehicle_position cvp ON v.vehicle_id = cvp.vehicle_id

      LEFT JOIN vehicle_location_cache vlc ON vlc.vehicle_id = v.vehicle_id

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

      ct.vehicle_id,

      ct.time,

      ct.latitude,

      ct.longitude,

      ct.speed,

      ct.ignition,


      ct.movement,

      ct.total_odometer

      get_vehicle_status(ct.time, ct.movement, ct.speed) AS status,

      vcl.road,
      
      vlc.road_class,

      vlc.route_number,

      vlc.speed_limit,

      vlc.suburb,

      vlc.city,

      vlc.province,

      vlc.country,

      vlc.display_name

      FROM clean_telemetry ct

      LEFT JOIN vehicle_location_cache vlc ON vlc.vehicle_id = ct.vehicle_id

      WHERE 

      ct.measurement = 'avl'

      AND time >= (SELECT MAX(time) FROM clean_telemetry) - INTERVAL '30 seconds'

      ORDER BY vehicle_id, time;

      `);


      
      const bucket = {}




      for(const row of result.rows){




        
        if(!bucket[row.vehicle_id]){



          bucket[row.vehicle_id] = [];



        }




        bucket[row.vehicle_id].push(row);

      }

      const features = [];

      for(const [vehicleId, points] of Object.entries(bucket)) {

        const latest = points[points.length - 1];

        const coordinates = points.map(point => [
          Number(point.longitude),
          Number(point.latutude)
        ]);

        features.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates
          },
          properties: {

          vehicleId,

          deviceId: latest.device_id,

          status: latest.status,
            
          times: row.time,

          latitude: Number(row.latitude),

          longitude: Number(row.longitude),

          speed: Number(latest.speed),

          ignition: row.ignition,

          movement: latest.movement,

          odometer: Number(latest.total_odometer),

          timestamp: latest.time,

          times: points.map(point => point.time),

          road: latest.road,

          roadClass: latest.road_class,

          speedLimit: latest.speed_limit,

          suburb: latest.subrub,

          city: latest.city,

          province = latest.province,

          country: latest.country,

          displayName: latest.display_name

          }

        });


      }


      
      return success(res, {
        type: "FeatyreCollection",
      
        timestamp: new Date().toISOString(),
      
      
        features





      }, 200);

      
  }
  



  catch(err){


 
 
 
    console.error('Get vehicle position buffer error:', err);
 


    
    return error(res, `Database Crash Detail: ${err.message}. Code: ${err.code || 'None'}. Stack: ${err.stack}`, 500);
 

  }

}





module.exports = {getLiveLocations, getVehicleById, getVehiclePositionBuffer};



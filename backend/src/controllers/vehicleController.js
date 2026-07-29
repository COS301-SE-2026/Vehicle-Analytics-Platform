


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

      COALESCE(daily_sum.distance_today, 0) as distance_today

      FROM vehicles v


      LEFT JOIN current_vehicle_position cvp ON v.vehicle_id = cvp.id
      LEFT JOIN (


      SELECT

      vehicle_id,

      SUM(distance_km) as distance_today FROM vehicle_daily_distance

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
  

    
    return error(res, 'Failed to fetch vehicle locations: ' + err.message, 500);
  

  }
}





async function getVehicleById(req, res) {


  const {vehicleId} = req.params;

  const {date} = req.query;


  
  if(!vehicleId){
  
    return error(res, 'Vehicle ID is required', 400);
  
  
  }

  
  try{
  
    const vehicleResult = await pool.query(`
  
      SELECT
  
      v.vehicle_id as id, v.device_id,
  
  
      v.created_at, CASE
      WHEN cvp.last_update IS NULL THEN 'offline'
  
      WHEN cvp.last_update < NOW() - INTERVAL '15 minutes' THEN 'offline'
  
  
      WHEN cvp.movement = 'Movement On' THEN 'active'
      WHEN cvp.ignition = 'Ignition On' THEN 'idle'
  
  
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


    
    let eventsQuery = `
    
    SELECT
    
    event_detail as type,
    
    event_category,
    
    
    speed,
        latitude,
    
    
        longitude,
        time as timestamp
    
        FROM vehicle_events
    
        WHERE vehicle_id = $1
    
        AND event_category IN ('green_driving_type', 'crash_detection', 'speeding')
    
    
        `;
    
    
        const eventsParams = [vehicleId];
    
        let paramCount = 2;

        
    
        if(date){
    
          eventsQuery += ` AND DATE(time) = $${paramCount}`;
    
    
          eventsParams.push(date);
      paramCount++;
    
    }




    
    eventsQuery += ` ORDER BY time DESC LIMIT 20`;


    
    
    const eventsResult = await pool.query(eventsQuery, eventsParams);

    
    let currentTrip = null;
    
    
    const tripResult = await pool.query(`
      SELECT
    
    
      trip_id,
    
      start_time,
        distance_km,
    
    
        EXTRACT(EPOCH FROM (NOW() - start_time)) as duration_seconds
    
        FROM trips
    
        WHERE vehicle_id = $1 AND status = 'open'
    
        ORDER BY start_time DESC
    
    
        LIMIT 1
    
        `, [vehicleId]);

        
    
    
        if(tripResult.rows.length > 0){
    
          const trip = tripResult.rows[0];
    
    
          currentTrip = {
    
            trip_id: trip.trip_id,
    
            start_time: trip.start_time,
    
            duration_seconds: parseInt(trip.duration_seconds)||0,
    
            distance_km: parseFloat(trip.distance_km)||0
      };
    }




    
    return success(res, {
    
      vehicle: vehicleResult.rows[0],
    
      recent_events: eventsResult.rows,
    
    
      current_trip: currentTrip


    }, 200);
  } 
  
  
  catch (err){
  
    console.error('Get vehicle by ID error:', err);
  
  
    return error(res, 'Failed to fetch vehicle details: '+err.message, 500);



  }
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
 
      });
    }

 
 
 
    return success(res, {
 
      timestamp: new Date().toISOString(),
 
      vehicles: bucket
 
    }, 200);
 
  } 
  
  



  catch(err){
  
    console.error('Get vehicle position buffer error:', err);
  
  
    return error(res, 'Failed to fetch vehicle positions: ' + err.message, 500);




  }
}






async function getVehiclesList(req, res) { 
  const {status, min_score, max_score, alerts, page = 1, limit = 20} = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let query = `  
    SELECT 
    v.vehicle_id as id,
    CASE
          WHEN pos.last_update IS NULL THEN 'offline'
          WHEN pos.last_update < NOW() - INTERVAL '5 minutes' THEN 'offline'
          WHEN COALESCE(pos.speed, 0) > 0 THEN 'moving'
          ELSE 'idle'
        END as status,
        pos.speed as current_speed,
        pos.latitude,
        pos.longitude,
        pos.last_update as last_updated,
        COALESCE(s.safety_score, 0) as safety_score,
        COALESCE(ds.distance_today, 0) as distance_today,
        CASE 
        WHEN ve.vehicle_id IS NOT NULL THEN true 
        ELSE false 
        END as has_alert,
        CASE 
          WHEN pos.speed > 80 THEN true 
          ELSE false 
          END as is_speeding
      FROM vehicles v
      LEFT JOIN current_vehicle_position pos ON v.vehicle_id = pos.id
      LEFT JOIN driver_daily_safety_scores s ON v.vehicle_id = s.vehicle_id AND s.score_date = CURRENT_DATE
      LEFT JOIN (
      SELECT vehicle_id, SUM(distance_km) as distance_today
      FROM vehicle_daily_distance
      WHERE bucket = date_trunc('day', NOW())
      GROUP BY vehicle_id
      ) ds ON v.vehicle_id = ds.vehicle_id
      LEFT JOIN (
      SELECT DISTINCT vehicle_id 
        FROM vehicle_events 
        WHERE time > NOW() - INTERVAL '1 hour'
        AND event_category IN ('green_driving_type', 'crash_detection', 'speeding')
        ) ve ON v.vehicle_id = ve.vehicle_id
      WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      if(status){
        query += ` AND status = $${paramCount}`;
        params.push(status);
        paramCount++;
    }
    if(min_score){
      query += ` AND COALESCE(s.safety_score, 0) >= $${paramCount}`;
      params.push(min_score);
      paramCount++;
    }

    if(max_score){    
      query += ` AND COALESCE(s.safety_score, 0) <= $${paramCount}`;
      params.push(max_score);
      paramCount++;
    }
    if(alerts === 'true'){
      query += ` AND ve.vehicle_id IS NOT NULL`;
    }
    query += ` ORDER BY v.vehicle_id LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), offset);
    const result = await pool.query(query, params);
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'moving') as moving,
        COUNT(*) FILTER (WHERE status = 'idle') as idle,
        COUNT(*) FILTER (WHERE status = 'offline') as offline,
        COUNT(*) FILTER (WHERE has_alert) as alerts,
        COUNT(*) FILTER (WHERE is_speeding) as speeding,
        (
        SELECT ROUND(AVG(CAST(safety_score AS numeric)), 1)
          FROM driver_daily_safety_scores
          WHERE score_date = (
          SELECT MAX(score_date) FROM driver_daily_safety_scores
          )
          ) as avg_safety_score
          FROM (
          SELECT 
          v.vehicle_id,
          CASE
          WHEN pos.last_update IS NULL THEN 'offline'
          WHEN pos.last_update < NOW() - INTERVAL '5 minutes' THEN 'offline'
          WHEN COALESCE(pos.speed, 0) > 0 THEN 'moving'
          ELSE 'idle'
          END as status,
          CASE 
          WHEN ve.vehicle_id IS NOT NULL THEN true 
            ELSE false 
          END as has_alert,
          CASE 
          WHEN pos.speed > 80 THEN true 
          ELSE false 
          END as is_speeding
          FROM vehicles v
          LEFT JOIN current_vehicle_position pos ON v.vehicle_id = pos.id
        LEFT JOIN (
        SELECT DISTINCT vehicle_id 
        FROM vehicle_events 
    
        WHERE time > NOW() - INTERVAL '1 hour'
    
    
        AND event_category IN ('green_driving_type', 'crash_detection', 'speeding')
    
        ) ve ON v.vehicle_id = ve.vehicle_id
    
    
        ) stats
    
        `);




    
        const lowestScoreResult = await pool.query(`
    
    
          SELECT 
        v.vehicle_id as id,
    
        COALESCE(s.safety_score, 0) as safety_score
    
    
        FROM vehicles v
    
        LEFT JOIN driver_daily_safety_scores s ON v.vehicle_id = s.vehicle_id AND s.score_date = CURRENT_DATE
    
        ORDER BY COALESCE(s.safety_score, 0) ASC
      LIMIT 1
    
      `);




   
      const stats = statsResult.rows[0];
   
      stats.lowest_scoring_vehicle = lowestScoreResult.rows.length > 0 ? lowestScoreResult.rows[0].id : null;
   
      stats.lowest_score = lowestScoreResult.rows.length > 0 ? parseFloat(lowestScoreResult.rows[0].safety_score) : null;



   
      return success(res, {
   
        
      
      
        vehicles: result.rows,
      
      
        stats: stats,
     
     
        pagination: {
      
        page: parseInt(page),
      
      
        limit: parseInt(limit)
      }
    }, 200);
  } 
  
  
  catch (err) {
  
    console.error('Get vehicles list error:', err);
  
    return error(res, 'Failed to fetch vehicles: '+err.message, 500);
  
  }
}




module.exports = {getLiveLocations, getVehicleById, getVehiclePositionBuffer, getVehiclesList};

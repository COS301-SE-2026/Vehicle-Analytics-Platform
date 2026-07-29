


const {pool} = require('../db/pool');

const {success, error} = require('../utils/response');






const ACTIVITY_RANGES = {


  
  day: {bucket: '1 hour', interval: '1 day' },





  
  week: {bucket: '1 day', interval: '7 days' },



};





async function getFleetKPIs(req, res) {
 
 
  try{

    const vehicles_result = await pool.query(`


      SELECT

 
      COUNT(*) as total_vehicles,
 
 
      COUNT(*) FILTER (

      


      
      WHERE last_update >= NOW() AT TIME ZONE 'UTC' - INTERVAL '1 hour'
      
      ) as active_vehicles
    
    
      FROM current_vehicle_position
    
      `);

    
      const alerts_result = await pool.query(`
    
        SELECT
    
        time,
    
        vehicle_id,
    
        event_category,
    
    
        event_detail,
        speed,
    
        latitude,
    
    
        longitude
    
        FROM vehicle_events
    
        WHERE time >= NOW() AT TIME ZONE 'UTC' - INTERVAL '15 seconds'
    

    
        
      AND event_category IN ('green_driving_type', 'crash_detection', 'speeding')
      
      ORDER BY time DESC;


    `);




    
    const distance_result = await pool.query(`
    
      SELECT
    
      COALESCE(SUM(distance_km), 0) AS distance_today
    
      FROM vehicle_daily_distance
    
    
      WHERE bucket >= date_trunc('day', NOW() AT TIME ZONE 'UTC');


      
    `);




    
    const v = vehicles_result.rows[0];
    
    const d = distance_result.rows[0];


    
    return success(res, {
    
    
      total_vehicles:  parseInt(v.total_vehicles)||0,
    
      active_vehicles: parseInt(v.active_vehicles)||0,
    
    
      alerts_today:    alertsCount,
    
      distance_today:  parseFloat(d.distance_today)||0,
    
      last_updated:    new Date().toISOString()
    
    }, 200);

  }
  


  
  
  catch (err) {
  

    
    console.error('Get fleet KPIs error:', err);
  

    
    return error(res, 'Failed to fetch KPIs: '+err.message, 500);
  

  }

}





async function getActiveAlerts(req, res) {

  const limit = Number.parseInt(req.query.limit)||50;


  
  
  try{

    
    const result = await pool.query(`
  

      SELECT
  
      vehicle_id,
        event_detail as type,
  
        event_category,
  
  
  
        latitude,
  
        longitude,
  
        speed,
  
  
  
        time as timestamp
      FROM vehicle_events
  
  
      WHERE event_category IN ('green_driving_type', 'crash_detection', 'speeding')
     
     
      ORDER BY time DESC
  
      LIMIT $1
  
  
      `, [limit]);

      
    
    
      const alerts = result.rows.map((alert, index) => {
    
        let severity = 'medium';
    
    
        if(alert.type === 'harsh_braking'){

          
        severity = 'high';
    
    
      } 
      
      
      else if(alert.event_category === 'crash_detection'){

    

        
        severity = 'critical';
    

      }

    
    
      const alertType = alert.type || alert.event_category;

    
    
      return {
    
      
        id: index + 1,
      
      
        vehicle_id: alert.vehicle_id,
    

    

        
        type: alertType,
    

        
        severity: severity,
    

        
        message: `${alert.vehicle_id}: ${alertType} at ${alert.speed} km/h`,
    

        
        latitude: Number.parseFloat(alert.latitude),
    

        
        longitude: Number.parseFloat(alert.longitude),
    

        
        speed: alert.speed,
    

    

        
        timestamp: alert.timestamp,
      };

    });



    
    return success(res, { total: alerts.length, alerts }, 200);


  } 
  
  

  
  
  catch (err) {
  
  

    
    const errorMessage = err.message || 'Failed to fetch alerts';
  

  

    
    console.error('Get active alerts error:', err);
  

    
    return error(res, 'Failed to fetch alerts: '+errorMessage, 500);
  }

}





async function getFleetActivityHistory(req, res) {

 
 
  const range = (req.query.range || 'day').toLowerCase();



  
  const config = ACTIVITY_RANGES[range];







  
  if(!config){

    
    return error(res, 'Invalid range. Use day or week.', 400);
  

  }






  try {
  
  
    const result = await pool.query(`
  
      SELECT
        time_bucket($1::interval, time) AS bucket,
  
  
        COUNT(DISTINCT vehicle_id) FILTER (WHERE speed >= 3) AS active_vehicles
  
        FROM clean_telemetry
      WHERE time >= NOW() - $2::interval 
  
      GROUP BY 1
  
  
      ORDER BY 1;
  
      `, [config.bucket, config.interval]);

      
    
    
      const points = result.rows.map((row) => ({
    
        bucket: row.bucket,
    
        active_vehicles: parseInt(row.active_vehicles)||0,



    
      }));



      
    
    
    
      return success(res, {
    
        range,
    
        bucket: config.bucket,
    
    
        points,


    }, 200);
  } 
  
  
  catch (err) {
  
    console.error('Get fleet activity history error:', err);
  
  
    return error(res, 'Failed to fetch activity history: '+err.message, 500);



  }
}






async function getTotalDistanceToday(req, res) {



  try{

    const result = await pool.query(`


      SELECT

      COALESCE(SUM(distance_km), 0) AS total_lifetime_distance,

      COALESCE(

      SUM(distance_km) FILTER (

      WHERE bucket >= date_trunc('day', NOW() AT TIME ZONE 'UTC')

      ),

      0

      ) AS distance_today,

      COUNT(DISTINCT vehicle_id) FILTER (

      WHERE bucket >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
        ) AS vehicles_driven_today


        FROM vehicle_daily_distance;
    `);



    
    const data = result.rows[0];


    
    return success(res, {
    
      total_distance: Number(data.total_lifetime_distance),
    
      distance_today: Number(data.distance_today),
    
      vehicles_driven_today: Number(data.vehicles_driven_today),
    
    
      unit: 'km'



    });

  } 
  
  
  
  
  catch (err) {
  

    
    console.error('Get total distance error:', err);
  


  
    
    return error(res, 'Failed to fetch fleet metrics', 500);
  }

}







async function getFleetStats(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
      COUNT(*) as total_vehicles,
        COUNT(*) FILTER (WHERE status = 'active') as active_vehicles,
        COUNT(*) FILTER (WHERE status = 'idle') as idle_vehicles,
        COUNT(*) FILTER (WHERE status = 'offline') as offline_vehicles,
        COUNT(*) FILTER (WHERE has_alert) as alerts
        FROM (
        SELECT 
        v.vehicle_id,
          CASE
          WHEN pos.last_update IS NULL THEN 'offline'
          WHEN pos.last_update < NOW() - INTERVAL '5 minutes' THEN 'offline'
          WHEN COALESCE(pos.speed, 0) > 0 THEN 'active'
            ELSE 'idle'
            END as status,
          CASE 
          WHEN ve.vehicle_id IS NOT NULL THEN true 
          ELSE false 
          END as has_alert
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
    
        const distanceResult = await pool.query(`  
          SELECT COALESCE(SUM(distance_km), 0) as total_distance
          FROM vehicle_daily_distance
          WHERE bucket = date_trunc('day', NOW())
    `);

    const userResult = await pool.query(`
      SELECT COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE role = 'admin') as admins,
      COUNT(*) FILTER (WHERE role = 'fleet_manager') as managers,
      COUNT(*) FILTER (WHERE role = 'viewer') as viewers
      FROM users
      WHERE is_active = true
    `);
    const users = userResult.rows[0];
    return success(res, {
      total_vehicles: parseInt(result.rows[0].total_vehicles)||0,
      active_vehicles: parseInt(result.rows[0].active_vehicles)||0,
      idle_vehicles: parseInt(result.rows[0].idle_vehicles)||0,
      offline_vehicles: parseInt(result.rows[0].offline_vehicles)||0,
      alerts: parseInt(result.rows[0].alerts)||0,
      total_distance_today: parseFloat(distanceResult.rows[0].total_distance)||0,
      users: {
        total: parseInt(users.total_users)||0,
        admins: parseInt(users.admins)||0,
        managers: parseInt(users.managers)||0,
        viewers: parseInt(users.viewers)||0
      },
      last_updated: new Date().toISOString()
    }, 200);
  } 
  
  catch (err) {  
    console.error('Get fleet stats error:', err);
    return error(res, 'Failed to fetch fleet stats: '+err.message, 500);
  }
}




module.exports = { getFleetKPIs, getActiveAlerts, getFleetActivityHistory, getTotalDistanceToday, getFleetStats };



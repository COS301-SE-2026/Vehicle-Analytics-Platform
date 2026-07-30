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

      


      
      -- data_now(), not NOW(): telemetry runs ~3 days ahead, so every
        -- vehicle satisfied a NOW()-relative window and active_vehicles
        -- read 14/15 permanently, dead ones included.
        WHERE last_update >= data_now() - INTERVAL '1 hour'
      
      ) as active_vehicles
    
    
      FROM current_vehicle_position
    
      `);

    
      const alerts_result = await pool.query(`
      -- Was scoped to INTERVAL '15 seconds' -- not "today", so this almost
      -- always read 0-2. Also selected 7 columns of every row purely to
      -- take .length; COUNT(*) does it in the database.
      -- 'speeding' dropped: no such event_category is ever emitted.
      SELECT COUNT(*) AS alert_count
      FROM vehicle_events
      WHERE time >= data_today()
        AND event_category IN ('green_driving_type', 'crash_detection')
    `);




    
    const distance_result = await pool.query(`
    
      SELECT
    
      COALESCE(SUM(distance_km), 0) AS distance_today
    
      FROM vehicle_daily_distance
    
    
      WHERE day >= data_today();


      
    `);




    
    const v = vehicles_result.rows[0];
    
    const d = distance_result.rows[0];


    
    return success(res, {
    
    
      total_vehicles:  parseInt(v.total_vehicles)||0,
    
      active_vehicles: parseInt(v.active_vehicles)||0,
    
    
      alerts_today:    parseInt(alerts_result.rows[0].alert_count) || 0,
    
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
        ve.vehicle_id,
        ve.event_detail as type,
        ve.event_category,
        ve.latitude,
        ve.longitude,
        ve.speed,
        ve.time as timestamp,
        vlc.display_name
      FROM vehicle_events ve
      -- Join the OSM cache so \`location\` reads as a road/suburb name
      -- rather than a coordinate pair. Falls back to lat/lng when a
      -- vehicle has no cached geocode yet.
      LEFT JOIN vehicle_location_cache vlc ON vlc.vehicle_id = ve.vehicle_id
      WHERE ve.event_category IN (
              'green_driving_type', 'crash_detection',
              -- 'speeding' dropped: the pipeline never emits it, so it
              -- silently matched nothing. Security events added --
              -- towing/unplug/immobilizer are the most urgent things here.
              'towing', 'unplug', 'immobilizer'
            )
      ORDER BY ve.time DESC
  
      LIMIT $1
  
  
      `, [limit]);

      
    
    
      // Field names must match what RecentVehicleEvents reads. The previous
      // shape (vehicle_id / type / message, no location, lowercase
      // severity) meant every field resolved to undefined and each row
      // rendered blank -- an empty card with no error anywhere.
      const alerts = result.rows.map((alert, index) => {
        const detail = (alert.type || '').toLowerCase();
        const category = alert.event_category;

        let eventType = category || 'unknown';
        let severity = 'LOW';
        let description = alert.type || 'Event recorded';

        if (category === 'crash_detection') {
          eventType = 'crash'; severity = 'HIGH';
          description = alert.type || 'Impact detected';
        } else if (detail.includes('harsh_braking')) {
          eventType = 'harsh_braking'; severity = 'MEDIUM';
          description = 'Harsh braking detected';
        } else if (detail.includes('harsh_acceleration')) {
          eventType = 'harsh_acceleration'; severity = 'MEDIUM';
          description = 'Harsh acceleration detected';
        } else if (detail.includes('harsh_cornering')) {
          eventType = 'harsh_cornering'; severity = 'MEDIUM';
          description = 'Harsh cornering detected';
        } else if (category === 'towing' || category === 'unplug' || category === 'immobilizer') {
          // Security/tamper events -- urgent individually.
          eventType = category; severity = 'HIGH';
          description = category === 'towing' ? 'Vehicle being towed'
                      : category === 'unplug' ? 'Tracking device unplugged'
                      : 'Immobilizer activated';
        }

        const hasCoords = alert.latitude != null && alert.longitude != null;

        return {
          // Index alone collides across refetches; key on the event itself.
          id: `${alert.vehicle_id}-${new Date(alert.timestamp).getTime()}-${index}`,
          vehicleId: alert.vehicle_id,
          eventType,
          description,
          location: alert.display_name
            || (hasCoords
                ? `${Number(alert.latitude).toFixed(4)}, ${Number(alert.longitude).toFixed(4)}`
                : 'Unknown location'),
          // Uppercase: SEVERITY_STYLES is keyed HIGH/MEDIUM/LOW, so
          // lowercase silently fell through to the LOW style.
          severity,
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
      WHERE time >= data_now() - $2::interval 
  
      GROUP BY 1
  
  
      ORDER BY 1;
  
      `, [config.bucket, config.interval]);

      
    
    
      // Recharts reads dataKey="time" and dataKey="vehicles". Returning
      // {bucket, active_vehicles} gave it rows whose keys it didn't
      // recognise -- every bar had no value and no label, so the chart
      // rendered blank rather than erroring.
      const points = result.rows.map((row) => ({
        time: (() => {
          const d = new Date(row.bucket);
          return range === 'week'
            ? d.toLocaleDateString('en-US', { weekday: 'short' })
            : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        })(),
        vehicles: parseInt(row.active_vehicles) || 0,
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

      WHERE day >= data_today()

      ),

      0

      ) AS distance_today,

      COUNT(DISTINCT vehicle_id) FILTER (

      WHERE day >= data_today()
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
          WHEN pos.last_update < data_now() - INTERVAL '5 minutes' THEN 'offline'
          WHEN COALESCE(pos.speed, 0) > 0 THEN 'active'
            ELSE 'idle'
            END as status,
          CASE 
          WHEN ve.vehicle_id IS NOT NULL THEN true 
          ELSE false 
          END as has_alert
          FROM vehicles v
          LEFT JOIN current_vehicle_position pos ON pos.vehicle_id = v.vehicle_id
          LEFT JOIN (
          SELECT DISTINCT vehicle_id 
          FROM vehicle_events 
          WHERE time > data_now() - INTERVAL '1 hour'
          AND event_category IN ('green_driving_type', 'crash_detection')
        ) ve ON v.vehicle_id = ve.vehicle_id
        ) stats
        `); 
    
        const distanceResult = await pool.query(`  
          SELECT COALESCE(SUM(distance_km), 0) as total_distance
          FROM vehicle_daily_distance
          WHERE day = data_today()
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



const {pool} = require('../db/pool');

const {success, error} = require('../utils/response');



async function getLiveLocations(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        v.vehicle_id AS id,
        v.device_id,
        get_vehicle_status(cvp.last_update, cvp.movement, cvp.speed) AS status,
        cvp.latitude,
        cvp.longitude,
        cvp.speed,
        cvp.total_odometer,
        cvp.ignition,
        cvp.movement,
        cvp.last_update,
        vlc.road,
        vlc.speed_limit,
        vlc.city,
        vlc.display_name,
        COALESCE(daily.distance_km, 0) AS distance_today
      FROM vehicles v
      LEFT JOIN current_vehicle_position cvp ON cvp.vehicle_id = v.vehicle_id
      LEFT JOIN vehicle_location_cache vlc   ON vlc.vehicle_id = v.vehicle_id
      -- vehicle_daily_distance is already one row per vehicle per day, so
      -- this is a direct join rather than a SUM-grouped subquery.
      LEFT JOIN vehicle_daily_distance daily
             ON daily.vehicle_id = v.vehicle_id
            AND daily.day = data_today()
      ORDER BY v.vehicle_id
    `);
 
    return success(res, {
      timestamp: new Date().toISOString(),
      count: result.rows.length,
      vehicles: result.rows,
    }, 200);
  } catch (err) {
    console.error('Get live locations error:', err);
    return error(res, 'Failed to fetch vehicle locations', 500);
  }
}
 
async function getVehicleById(req, res) {
  const {vehicleId} = req.params;
  const {date} = req.query;
 
  if (!vehicleId) {
    return error(res, 'Vehicle ID is required', 400);
  }
 
  try {
    const vehicleResult = await pool.query(`
      SELECT
        v.vehicle_id AS id,
        v.device_id,
        v.created_at,
        get_vehicle_status(cvp.last_update, cvp.movement, cvp.speed) AS status,
        cvp.latitude,
        cvp.longitude,
        cvp.speed,
        cvp.total_odometer,
        cvp.ignition,
        cvp.movement,
        cvp.last_update,
        -- CurrentTripTab compares speed against speedLimit to flag speeding.
        -- This is the real OSM limit for the road the vehicle is on, rather
        -- than a hardcoded number.
        vlc.speed_limit,
        vlc.road,
        vlc.display_name
      FROM vehicles v
      LEFT JOIN current_vehicle_position cvp ON cvp.vehicle_id = v.vehicle_id
      LEFT JOIN vehicle_location_cache vlc   ON vlc.vehicle_id = v.vehicle_id
      WHERE v.vehicle_id = $1
    `, [vehicleId]);
 
    if (vehicleResult.rows.length === 0) {
      return error(res, 'Vehicle not found', 404);
    }
 
    let eventsQuery = `
      SELECT
        event_detail AS type,
        event_category,
        speed,
        latitude,
        longitude,
        time AS timestamp
      FROM vehicle_events
      WHERE vehicle_id = $1
        AND event_category IN ('green_driving_type', 'crash_detection')
    `;
    const eventsParams = [vehicleId];
 
    if (date) {
      eventsQuery += ` AND DATE(time) = $2`;
      eventsParams.push(date);
    }
    eventsQuery += ` ORDER BY time DESC LIMIT 20`;
 
    const eventsResult = await pool.query(eventsQuery, eventsParams);
 
    const tripResult = await pool.query(`
      SELECT trip_id, start_time, distance_km,
             EXTRACT(EPOCH FROM (NOW() - start_time)) AS duration_seconds
      FROM trips
      WHERE vehicle_id = $1 AND status = 'open'
      ORDER BY start_time DESC
      LIMIT 1
    `, [vehicleId]);
 
    let currentTrip = null;
    if (tripResult.rows.length > 0) {
      const trip = tripResult.rows[0];
      currentTrip = {
        trip_id: trip.trip_id,
        start_time: trip.start_time,
        duration_seconds: Number.parseInt(trip.duration_seconds) || 0,
        distance_km: Number.parseFloat(trip.distance_km) || 0,
      };
    }
 
    return success(res, {
      vehicle: vehicleResult.rows[0],
      recent_events: eventsResult.rows,
      current_trip: currentTrip,
    }, 200);
  } catch (err) {
    console.error('Get vehicle by ID error:', err);
    return error(res, 'Failed to fetch vehicle details', 500);
  }
}
 
async function getVehiclePositionBuffer(req, res) {
  try {
    // get_position_buffer (V28) anchors the window PER VEHICLE to that
    // vehicle's own newest reading. NOW() cannot be used here: telemetry is
    // stamped ~3 days in the future, so `time >= NOW() - 30s` matched every
    // row ever recorded and returned 4000+ points for a single vehicle --
    // which is what hung the map. p_max_points is a second guard.
    const result = await pool.query(
      `SELECT * FROM get_position_buffer($1::interval, $2::int)`,
      ['30 seconds', 60]
    );
 
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.vehicle_id]) grouped[row.vehicle_id] = [];
      grouped[row.vehicle_id].push(row);
    }
 
    const features = [];
    for (const [vehicleId, points] of Object.entries(grouped)) {
      const latest = points[points.length - 1];
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          // GeoJSON order is [longitude, latitude].
          coordinates: points.map(p => [Number(p.longitude), Number(p.latitude)]),
        },
        properties: {
          vehicleId,
          deviceId: latest.device_id,
          status: latest.status,
          speed: Number(latest.speed),
          ignition: latest.ignition,
          movement: latest.movement,
          odometer: Number(latest.total_odometer),
          timestamp: latest.time,
          // Parallel to coordinates. FleetMap's playback queue uses these
          // real gaps to time each segment, so motion matches actual speed.
          times: points.map(p => p.time),
          road: latest.road,
          speedLimit: latest.speed_limit,
          city: latest.city,
          displayName: latest.display_name,
        },
      });
    }
 
    return success(res, {
      type: 'FeatureCollection',
      timestamp: new Date().toISOString(),
      features,
    }, 200);
  } catch (err) {
    console.error('Get vehicle position buffer error:', err);
    return error(res, 'Failed to fetch vehicle positions', 500);
  }
}



async function getVehiclesList(req, res) {

  const {status, min_score, max_score, alerts, page = 1, limit = 20} = req.query;

  const offset = (Number.parseInt(page) - 1) * Number.parseInt(limit);



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

      s.safety_score,

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
    LEFT JOIN current_vehicle_position pos ON v.vehicle_id = pos.vehicle_id

    LEFT JOIN driver_daily_safety_scores s ON v.vehicle_id = s.vehicle_id AND s.score_date = CURRENT_DATE

    LEFT JOIN (

      SELECT vehicle_id, SUM(distance_km) as distance_today


      FROM vehicle_daily_distance

      WHERE day = date_trunc('day', NOW())

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

      query += ` AND (CASE
      WHEN pos.last_update IS NULL THEN 'offline'
      WHEN pos.last_update < NOW() - INTERVAL '5 minutes' THEN 'offline'
      WHEN COALESCE(pos.speed, 0) > 0 THEN 'moving'
      ELSE 'idle'
      END) = $${paramCount}`;
      params.push(status);
      paramCount++;
    }




    if(min_score){

      query += ` AND s.safety_score >= $${paramCount}`;

      params.push(min_score);

      paramCount++;

    }




    if(max_score){

      query += ` AND s.safety_score <= $${paramCount}`;

      params.push(max_score);

      paramCount++;

    }




    if(alerts === 'true'){
      query += ` AND ve.vehicle_id IS NOT NULL`;

    }




    query += ` ORDER BY v.vehicle_id LIMIT $${paramCount} OFFSET $${paramCount + 1}`;

    params.push(Number.parseInt(limit), offset);




    const result = await pool.query(query, params);



    const statsResult = await pool.query(`

      SELECT 


        COUNT(*) as total,

        COUNT(*) FILTER (WHERE status = 'moving') as moving,

        COUNT(*) FILTER (WHERE status = 'idle') as idle,

        COUNT(*) FILTER (WHERE status = 'offline') as offline,


        COUNT(*) FILTER (WHERE has_alert) as alerts,
        COUNT(*) FILTER (WHERE is_speeding) as speeding,


        COALESCE(
          (SELECT ROUND(AVG(CAST(safety_score AS numeric)), 1)

           FROM driver_daily_safety_scores

           WHERE score_date = CURRENT_DATE),

          0

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

        LEFT JOIN current_vehicle_position pos ON v.vehicle_id = pos.vehicle_id


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

      ORDER BY s.safety_score ASC NULLS LAST

      LIMIT 1
    `);




    const stats = statsResult.rows[0];

    stats.lowest_scoring_vehicle = lowestScoreResult.rows.length > 0 ? lowestScoreResult.rows[0].id : null;

    stats.lowest_score = lowestScoreResult.rows.length > 0 ? Number.parseFloat(lowestScoreResult.rows[0].safety_score) : null;





    return success(res, {

      vehicles: result.rows,

      stats: stats,


      pagination: {

        page: Number.parseInt(page),

        limit: Number.parseInt(limit)

      }

    }, 200);

  } catch (err) {
    console.error('Get vehicles list error:', err);

    return error(res, 'Failed to fetch vehicles: ' + err.message, 500);

  }

}



module.exports = {getLiveLocations, getVehicleById, getVehiclePositionBuffer, getVehiclesList};





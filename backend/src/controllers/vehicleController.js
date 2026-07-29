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
        vlc.road_class,
        vlc.route_number,
        vlc.speed_limit,
        vlc.suburb,
        vlc.city,
        vlc.province,
        vlc.country,
        vlc.display_name,

        COALESCE(daily.distance_km, 0) AS distance_today

      FROM vehicles v

      LEFT JOIN current_vehicle_position cvp
        ON cvp.vehicle_id = v.vehicle_id

      LEFT JOIN vehicle_location_cache vlc
        ON vlc.vehicle_id = v.vehicle_id

      -- vehicle_daily_distance (V7) is already one row per vehicle per day
      -- (time_bucket('1 day', ...) GROUP BY day, vehicle_id) -- a direct
      -- join, not a SUM-grouped subquery, and "day" is the actual column
      -- name (the previous query filtered on "bucket", which doesn't exist
      -- on this view and would fail on every call).
      LEFT JOIN vehicle_daily_distance daily
        ON daily.vehicle_id = v.vehicle_id
       AND daily.day = date_trunc('day', NOW() AT TIME ZONE 'UTC')

      ORDER BY v.vehicle_id;
    `);

    return success(
      res,
      {
        timestamp: new Date().toISOString(),
        count: result.rows.length,
        vehicles: result.rows,
      },
      200
    );
  } catch (err) {
    console.error("Get live locations error:", err);
    return error(res, 'Failed to fetch live locations', 500);
  }
}


async function getVehicleById(req, res) {
  const {vehicleId} = req.params;
  try{
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

        vlc.road,
        vlc.road_class,
        vlc.route_number,
        vlc.speed_limit,
        vlc.suburb,
        vlc.city,
        vlc.province,
        vlc.country,
        vlc.display_name

      FROM vehicles v

      LEFT JOIN current_vehicle_position cvp
          ON cvp.vehicle_id = v.vehicle_id

      LEFT JOIN vehicle_location_cache vlc
          ON vlc.vehicle_id = v.vehicle_id

      WHERE v.vehicle_id = $1;
      `, [vehicleId]);

    if(vehicleResult.rows.length===0){
     return error(res, 'Vehicle not found', 404);
    }

    const eventsResult = await pool.query(`
      SELECT
          event_detail AS type,
          event_category,
          speed,
          latitude,
          longitude,
          time AS timestamp
      FROM vehicle_events
      WHERE vehicle_id = $1
      ORDER BY time DESC
      LIMIT 20;
      `, [vehicleId]);

    return success(res, {
      vehicle: vehicleResult.rows[0],
      recent_events: eventsResult.rows,
    }, 200);
  }
  catch (err){
    console.error('Get vehicle by ID error:', err);
    return error(res, 'Failed to fetch vehicle', 500);
  }
}


async function getVehiclePositionBuffer(req, res) {
    try {
        const result = await pool.query(`
            SELECT
                ct.vehicle_id,
                ct.device_id,
                ct.time,
                ct.latitude,
                ct.longitude,
                ct.speed,
                ct.ignition,
                ct.movement,
                ct.total_odometer,

                get_vehicle_status(ct.time, ct.movement, ct.speed) AS status,

                vlc.road,
                vlc.road_class,
                vlc.route_number,
                vlc.speed_limit,
                vlc.suburb,
                vlc.city,
                vlc.province,
                vlc.country,
                vlc.display_name

            FROM clean_telemetry ct

            LEFT JOIN vehicle_location_cache vlc
                ON vlc.vehicle_id = ct.vehicle_id

            WHERE
                ct.measurement = 'avl'
                -- Anchored to NOW(), not MAX(time) across the whole fleet.
                -- Anchoring to a fleet-wide max meant one vehicle's most
                -- recent point silently determined the window for every
                -- other vehicle -- a vehicle even slightly behind that max
                -- (different batch timing, a brief gap) could have its own
                -- recent points fall outside the window and drop out of
                -- the buffer for that cycle, with no relationship to
                -- whether that vehicle actually had a problem.
                AND ct.time >= NOW() - INTERVAL '30 seconds'

            ORDER BY
                ct.vehicle_id,
                ct.time;
        `);

        // Group rows by vehicle
        const grouped = {};

        for (const row of result.rows) {
            if (!grouped[row.vehicle_id]) {
                grouped[row.vehicle_id] = [];
            }
            grouped[row.vehicle_id].push(row);
        }

        const features = [];

        for (const [vehicleId, points] of Object.entries(grouped)) {
            // newest point
            const latest = points[points.length - 1];

            // GeoJSON coordinates MUST be [longitude, latitude]
            const coordinates = points.map(point => [
                Number(point.longitude),
                Number(point.latitude)
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
                    speed: Number(latest.speed),
                    ignition: latest.ignition,
                    movement: latest.movement,
                    odometer: Number(latest.total_odometer),
                    timestamp: latest.time,
                    road: latest.road,
                    roadClass: latest.road_class,
                    routeNumber: latest.route_number,
                    speedLimit: latest.speed_limit,
                    suburb: latest.suburb,
                    city: latest.city,
                    province: latest.province,
                    country: latest.country,
                    displayName: latest.display_name
                }
            });
        }

        return success(res, {
            type: "FeatureCollection",
            timestamp: new Date().toISOString(),
            features
        }, 200);

    }
    catch (err) {
        console.error("Get vehicle position buffer error:", err);
        return error(res, 'Failed to fetch vehicle position buffer', 500);
    }
}


module.exports = {getLiveLocations, getVehicleById, getVehiclePositionBuffer};
const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');

const ACTIVITY_RANGES = {
  day: { bucket: '1 hour', interval: '1 day' },
  week: { bucket: '1 day', interval: '7 days' },
};

async function getFleetKPIs(req, res) {
  try {
    // Query 1 — active vs total vehicles (Gold layer, instant)
    const vehicles_result = await pool.query(`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(*) FILTER (
          WHERE last_update >= NOW() AT TIME ZONE 'UTC' - INTERVAL '1 hour'
        ) as active_vehicles
      FROM current_vehicle_position
    `);

    // Query 2 — alerts today. Was `time >= NOW() - INTERVAL '15 seconds'`,
    // which meant "alerts in the last 15 seconds," not "alerts today" --
    // this counted almost always 0-2 events regardless of how many
    // safety events had actually happened since midnight. Also switched
    // to COUNT(*) instead of fetching every row just to read .length.
    const alerts_result = await pool.query(`
      SELECT COUNT(*) AS alert_count
      FROM vehicle_events
      WHERE time >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
    `);

    // Query 3 — vehicle_daily_distance (V7) is a true 1-day continuous
    // aggregate keyed by a column named "day", not "bucket" -- "bucket"
    // only exists on vehicle_distance_5min / vehicle_distance_10sec, the
    // finer-grained rollups. Since it's one row per vehicle per day,
    // this is an exact match, not a range.
    const distance_result = await pool.query(`
      SELECT
        COALESCE(SUM(distance_km), 0) AS distance_today
      FROM vehicle_daily_distance
      WHERE day = date_trunc('day', NOW() AT TIME ZONE 'UTC');
    `);

    const v = vehicles_result.rows[0];
    const a = alerts_result.rows[0];
    const d = distance_result.rows[0];

    return success(res, {
      total_vehicles:  parseInt(v.total_vehicles)  || 0,
      active_vehicles: parseInt(v.active_vehicles) || 0,
      alerts_today:    parseInt(a.alert_count) || 0,
      distance_today:  parseFloat(d.distance_today) || 0,
      last_updated:    new Date().toISOString()
    }, 200);

  } catch (err) {
    console.error('Get fleet KPIs error:', err);
    return error(res, 'Failed to fetch KPIs: ' + err.message, 500);
  }
}

// Classifies a vehicle_events row into {eventType, severity}. Only covers
// what the ingestion pipeline actually detects: harsh braking/acceleration/
// cornering, crash detection, and ignition on/off. "speeding" can't appear
// here -- there's no speed-limit-comparison event yet (would need to
// compare clean_telemetry.speed against vehicle_location_cache.speed_limit).
function classifyEvent(eventCategory, eventDetail) {
  const detail = (eventDetail || '').toLowerCase();

  if (eventCategory === 'crash_detection') {
    return { eventType: 'crash', severity: 'HIGH' };
  }
  if (detail.includes('harsh_braking') || detail.includes('harsh braking')) {
    return { eventType: 'harsh_braking', severity: 'MEDIUM' };
  }
  if (detail.includes('harsh_acceleration') || detail.includes('harsh acceleration')) {
    return { eventType: 'harsh_acceleration', severity: 'MEDIUM' };
  }
  if (detail.includes('harsh_cornering') || detail.includes('harsh cornering')) {
    return { eventType: 'harsh_cornering', severity: 'MEDIUM' };
  }
  if (eventCategory === 'ignition') {
    if (detail.includes('on'))  return { eventType: 'engine_on', severity: 'LOW' };
    if (detail.includes('off')) return { eventType: 'engine_off', severity: 'LOW' };
  }
  return { eventType: eventCategory || 'unknown', severity: 'LOW' };
}

function describeEvent(eventType, rawDetail) {
  switch (eventType) {
    case 'crash':              return rawDetail || 'Crash detected';
    case 'harsh_braking':      return 'Harsh braking detected';
    case 'harsh_acceleration': return 'Harsh acceleration detected';
    case 'harsh_cornering':    return 'Harsh cornering detected';
    case 'engine_on':          return 'Engine started';
    case 'engine_off':         return 'Engine turned off';
    default:                   return rawDetail || 'Event recorded';
  }
}

async function getActiveAlerts(req, res) {
  const limit = Number.parseInt(req.query.limit, 10) || 50;

  try {
    // Was: LIMIT 1 hardcoded, with `limit` computed above but never used
    // anywhere in the query (no placeholder for it at all) -- this
    // endpoint returned at most a single alert regardless of what was
    // requested. Also added the vehicle_location_cache join so `location`
    // is a real place name instead of nothing (the old shape didn't
    // return a location field at all, just raw lat/lng).
    const result = await pool.query(`
      SELECT
        ve.time,
        ve.vehicle_id,
        ve.event_category,
        ve.event_detail,
        ve.speed,
        ve.latitude,
        ve.longitude,
        vlc.display_name
      FROM vehicle_events ve
      LEFT JOIN vehicle_location_cache vlc
        ON vlc.vehicle_id = ve.vehicle_id
      ORDER BY ve.time DESC
      LIMIT $1
    `, [limit]);

    const alerts = result.rows.map((row, index) => {
      const { eventType, severity } = classifyEvent(row.event_category, row.event_detail);
      const hasCoords = row.latitude != null && row.longitude != null;

      return {
        id: `${row.vehicle_id}-${new Date(row.time).getTime()}-${index}`,
        vehicleId: row.vehicle_id,
        eventType,
        description: describeEvent(eventType, row.event_detail),
        location: row.display_name
          || (hasCoords ? `${Number(row.latitude).toFixed(4)}, ${Number(row.longitude).toFixed(4)}` : 'Unknown location'),
        severity,
        timestamp: row.time,
      };
    });

    return success(res, { total: alerts.length, alerts }, 200);
  } catch (err) {
    console.error('Get active alerts error:', err);
    return error(res, 'Failed to fetch alerts: ' + err.message, 500);
  }
}

function formatBucketLabel(bucket, range) {
  const d = new Date(bucket);
  if (range === 'week') {
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // 24h "HH:MM"
}

async function getFleetActivityHistory(req, res) {
  const range = (req.query.range || 'day').toLowerCase();
  const config = ACTIVITY_RANGES[range];

  if (!config) {
    return error(res, 'Invalid range. Use day or week.', 400);
  }

  const minSpeed = Number.parseFloat(req.query.minSpeed);
  const speedThreshold = Number.isFinite(minSpeed) ? minSpeed : 5;

  try {
    // Was: speedThreshold computed above and echoed back in the response
    // as if it were applied, but the query itself hardcoded `speed >= 3`
    // -- the min_speed query param had no actual effect. $3 now binds it
    // for real.
    const result = await pool.query(`
      SELECT
        time_bucket($1::interval, time) AS bucket,
        COUNT(DISTINCT vehicle_id) FILTER (WHERE speed >= $3) AS active_vehicles
      FROM clean_telemetry
      WHERE time >= NOW() - $2::interval
      GROUP BY 1
      ORDER BY 1;
    `, [config.bucket, config.interval, speedThreshold]);

    // Reshaped to {time, vehicles} -- what FleetActivityChart.jsx actually
    // renders (dataKey="vehicles", XAxis dataKey="time" expecting a
    // formatted label like "06:00"). The previous {bucket, active_vehicles}
    // shape required the frontend to reformat before it could be useful;
    // doing that here once instead of in every consumer.
    const points = result.rows.map((row) => ({
      time: formatBucketLabel(row.bucket, range),
      vehicles: parseInt(row.active_vehicles) || 0,
    }));

    return success(res, { points }, 200);
  } catch (err) {
    console.error('Get fleet activity history error:', err);
    return error(res, 'Failed to fetch activity history: ' + err.message, 500);
  }
}

async function getTotalDistanceToday(req, res) {
  try {
    // Same bucket -> day column fix as getFleetKPIs above.
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(distance_km), 0) AS total_lifetime_distance,

        COALESCE(
          SUM(distance_km) FILTER (
            WHERE day = date_trunc('day', NOW() AT TIME ZONE 'UTC')
          ),
          0
        ) AS distance_today,

        COUNT(DISTINCT vehicle_id) FILTER (
          WHERE day = date_trunc('day', NOW() AT TIME ZONE 'UTC')
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

  } catch (err) {
    console.error(err);
    return error(res, 'Failed to fetch fleet metrics', 500);
  }
}

module.exports = { getFleetKPIs, getActiveAlerts, getFleetActivityHistory, getTotalDistanceToday };

const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_USER_AGENT = 'FleetAnalyticsPlatform/1.0 (contact: ops@yourfleet.example)';

const OPEN_METEO_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const MIN_SAMPLE_SIZE = 10;

async function geocodeSuburb(searchTerm) {
  const cached = await pool.query(
    `SELECT display_name, ST_AsGeoJSON(centroid) AS centroid_geojson,
            ST_AsGeoJSON(area_geom) AS area_geojson, search_radius_m
     FROM location_geocode_cache WHERE search_term = $1`,
    [searchTerm]
  );
  if (cached.rows.length) return cached.rows[0];

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(searchTerm)}&format=json&polygon_geojson=1&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim request failed: ${res.status}`);

  const results = await res.json();
  if (!results.length) {
    throw new Error(`No location found for "${searchTerm}"`);
  }

  const place = results[0];
  const lat = Number.parseFloat(place.lat);
  const lon = Number.parseFloat(place.lon);
  const hasPolygon = place.geojson && (place.geojson.type === 'Polygon' || place.geojson.type === 'MultiPolygon');

  const FALLBACK_RADIUS_M = 2000;

  const insertResult = await pool.query(
    `INSERT INTO location_geocode_cache
       (search_term, display_name, centroid, area_geom, search_radius_m)
     VALUES (
       $1, $2,
       ST_SetSRID(ST_MakePoint($3, $4), 4326),
       ${hasPolygon ? 'ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)' : 'NULL'},
       ${hasPolygon ? 'NULL' : `$${hasPolygon ? 6 : 5}`}
     )
     ON CONFLICT (search_term) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING display_name, ST_AsGeoJSON(centroid) AS centroid_geojson,
               ST_AsGeoJSON(area_geom) AS area_geojson, search_radius_m`,
    hasPolygon
      ? [searchTerm, place.display_name, lon, lat, JSON.stringify(place.geojson)]
      : [searchTerm, place.display_name, lon, lat, FALLBACK_RADIUS_M]
  );

  return insertResult.rows[0];
}

// Rounds to the same grid weather_observations is keyed on, so repeated
// searches whose centroids land close together share cached weather rows.
function toGrid(value) {
  return Math.round(value * 1000) / 1000;
}

async function ensureHistoricalWeather(lat, lon, startDate, endDate) {
  const latGrid = toGrid(lat);
  const lonGrid = toGrid(lon);

  const existing = await pool.query(
    `SELECT obs_date FROM weather_observations
     WHERE lat_grid = $1 AND lon_grid = $2 AND obs_date BETWEEN $3 AND $4`,
    [latGrid, lonGrid, startDate, endDate]
  );
  const haveDates = new Set(existing.rows.map((r) => r.obs_date.toISOString().slice(0, 10)));

  const totalDays = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
  if (haveDates.size >= totalDays) return; // fully cached already

  const url = `${OPEN_METEO_ARCHIVE_URL}?latitude=${lat}&longitude=${lon}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo archive request failed: ${res.status}`);
  const data = await res.json();

  const { time, precipitation_sum, temperature_2m_max, temperature_2m_min } = data.daily;

  for (let i = 0; i < time.length; i++) {
    const obsDate = time[i];
    if (haveDates.has(obsDate)) continue; // already cached

    const precip = precipitation_sum[i];
    const tempMax = temperature_2m_max[i];
    const tempMin = temperature_2m_min[i];
    if (precip == null || tempMax == null) continue; // Open-Meteo gap for this date

    await pool.query(
      `INSERT INTO weather_observations
         (lat_grid, lon_grid, obs_date, precipitation_mm, temp_max_c, temp_min_c, weather_bucket)
       VALUES ($1, $2, $3, $4, $5, $6, bucket_weather($4, $5))
       ON CONFLICT (lat_grid, lon_grid, obs_date) DO NOTHING`,
      [latGrid, lonGrid, obsDate, precip, tempMax, tempMin]
    );
  }
}

async function getTodaysWeatherBucket(lat, lon) {
  const url = `${OPEN_METEO_FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
    `&current=precipitation,temperature_2m&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo forecast request failed: ${res.status}`);
  const data = await res.json();

  const precip = data.current.precipitation;
  const temp = data.current.temperature_2m;
  return { precip, temp };
}

async function getEventProbability(req, res) {
  const { suburb, lookbackDays } = req.query;
  if (!suburb) {
    return error(res, 'suburb query parameter is required', 400);
  }
  const lookback = Number.parseInt(lookbackDays, 10) || 90;

  try {
    const location = await geocodeSuburb(suburb);
    const centroid = JSON.parse(location.centroid_geojson);
    const [lon, lat] = centroid.coordinates;

    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - lookback * 86400000).toISOString().slice(0, 10);

    await ensureHistoricalWeather(lat, lon, startDate, endDate);

    const today = await getTodaysWeatherBucket(lat, lon);
    const bucketResult = await pool.query(
      `SELECT bucket_weather($1, $2) AS bucket`,
      [today.precip, today.temp]
    );
    const todayBucket = bucketResult.rows[0].bucket;

    const latGrid = toGrid(lat);
    const lonGrid = toGrid(lon);

    const areaFilter = location.area_geojson
      ? `ST_Contains(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326), ve.location)`
      : `ST_DWithin(
           ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
           ve.location::geography,
           $7
         )`;

    const queryParams = location.area_geojson
      ? [startDate, endDate, latGrid, lonGrid, location.area_geojson]
      : [startDate, endDate, latGrid, lonGrid, lon, lat, location.search_radius_m];

    const eventCounts = await pool.query(
      `SELECT ve.event_category,
              wo.weather_bucket,
              COUNT(*) AS event_count
       FROM vehicle_events ve
       JOIN weather_observations wo
         ON wo.lat_grid = $3
        AND wo.lon_grid = $4
        AND wo.obs_date = ve.time::date
       WHERE ve.time::date BETWEEN $1 AND $2
         AND ve.location IS NOT NULL
         AND ${areaFilter}
       GROUP BY ve.event_category, wo.weather_bucket`,
      queryParams
    );

    const daysInBucketResult = await pool.query(
      `SELECT COUNT(*) AS days FROM weather_observations
       WHERE lat_grid = $1 AND lon_grid = $2 AND weather_bucket = $3
         AND obs_date BETWEEN $4 AND $5`,
      [latGrid, lonGrid, todayBucket, startDate, endDate]
    );
    const daysInBucket = Number.parseInt(daysInBucketResult.rows[0].days, 10);

    const categoryCounts = {};
    for (const row of eventCounts.rows) {
      if (row.weather_bucket !== todayBucket) continue;
      categoryCounts[row.event_category] = Number.parseInt(row.event_count, 10);
    }

    const probabilities = Object.entries(categoryCounts).map(([category, count]) => ({
      event_category: category,
      probability: Math.round(((count + 1) / (daysInBucket + 2)) * 1000) / 1000,
      historical_occurrences: count,
      sample_size_days: daysInBucket,
      low_confidence: daysInBucket < MIN_SAMPLE_SIZE,
    }));

    return success(res, {
      location: { search_term: suburb, display_name: location.display_name, lat, lon },
      today_weather_bucket: todayBucket,
      lookback_days: lookback,
      sample_size_days: daysInBucket,
      probabilities,
    }, 200);
  } catch (err) {
    console.error('Event probability analysis error:', err);
    return error(res, 'Failed to generate probability report: ' + err.message, 500);
  }
}

module.exports = { getEventProbability };
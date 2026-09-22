'use strict';

const {
    REPORT_TIMEZONE,
    toLocalDate,
    addDays,
    datesBetween,
    minDate,
    maxDate,
} = require('../utils/dateUtils');

const OPEN_METEO_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const DAILY_VARS = 'precipitation_sum,temperature_2m_max,temperature_2m_min';

// The archive runs a few days behind, so recent days come from the
// forecast API (which also serves the recent past).
const ARCHIVE_LAG_DAYS = 7;

// Today and yesterday may still change (today is partly forecast), so
// cached values for them are refreshed after this long.
const RECENT_REFRESH_DAYS = 2;
const RECENT_MAX_AGE_HOURS = 3;

// Open-Meteo accepts comma-separated coordinates and returns one result per
// location. If your plan or endpoint rejects this, set BATCH_SIZE to 1.
const BATCH_SIZE = 50;
const BATCH_PAUSE_MS = 5000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Waits and retries when Open-Meteo returns 429 (rate limited).
async function fetchWithRetry(url, attempts = 4) {
    for (let i = 0; i < attempts; i += 1) {
        const res = await fetch(url);
        if (res.status !== 429) return res;
        await sleep(15000 * (i + 1));
    }
    throw new Error('Open-Meteo rate limit reached; try again in a few minutes');
}

function cellKey(lat, lon) {
    return `${Number(lat).toFixed(1)}|${Number(lon).toFixed(1)}`;
}

async function fetchAndStore(db, baseUrl, cells, startDate, endDate) {
    for (let i = 0; i < cells.length; i += BATCH_SIZE) {
        const batch = cells.slice(i, i + BATCH_SIZE);

        const params = new URLSearchParams({
            latitude: batch.map((c) => Number(c.lat).toFixed(1)).join(','),
            longitude: batch.map((c) => Number(c.lon).toFixed(1)).join(','),
            start_date: startDate,
            end_date: endDate,
            daily: DAILY_VARS,
            timezone: REPORT_TIMEZONE,
        });

        const res = await fetchWithRetry(`${baseUrl}?${params.toString()}`);
        if (!res.ok) {
            throw new Error(`Open-Meteo request failed (${res.status})`);
        }

        const body = await res.json();
        const results = Array.isArray(body) ? body : [body];

        const cols = { lat: [], lon: [], day: [], precip: [], tmax: [], tmin: [] };

        results.forEach((result, idx) => {
            const cell = batch[idx];
            const daily = result && result.daily;
            if (!cell || !daily || !Array.isArray(daily.time)) return;

            daily.time.forEach((day, j) => {
                const precip = daily.precipitation_sum[j];
                const tmax = daily.temperature_2m_max[j];
                if (precip == null || tmax == null) return; // gap in the model data

                // Store under the requested grid cell, not the model's
                // snapped coordinates, so lookups by cell always match.
                cols.lat.push(Number(cell.lat).toFixed(1));
                cols.lon.push(Number(cell.lon).toFixed(1));
                cols.day.push(day);
                cols.precip.push(precip);
                cols.tmax.push(tmax);
                cols.tmin.push(daily.temperature_2m_min[j] ?? null);
            });
        });

        if (cols.day.length === 0) {
            if (i + BATCH_SIZE < cells.length) await sleep(BATCH_PAUSE_MS);
            continue;
        }

        await db.query(
            `INSERT INTO weather_observations
                 (lat_grid, lon_grid, obs_date, precipitation_mm, temp_max_c, temp_min_c, weather_bucket)
             SELECT lat, lon, d, p, tmax, tmin, bucket_weather(p, tmax)
             FROM unnest($1::numeric[], $2::numeric[], $3::date[],
                         $4::numeric[], $5::numeric[], $6::numeric[])
                  AS t(lat, lon, d, p, tmax, tmin)
             ON CONFLICT (lat_grid, lon_grid, obs_date) DO UPDATE SET
                 precipitation_mm = EXCLUDED.precipitation_mm,
                 temp_max_c       = EXCLUDED.temp_max_c,
                 temp_min_c       = EXCLUDED.temp_min_c,
                 weather_bucket   = EXCLUDED.weather_bucket,
                 fetched_at       = NOW()`,
            [cols.lat, cols.lon, cols.day, cols.precip, cols.tmax, cols.tmin],
        );

        if (i + BATCH_SIZE < cells.length) await sleep(BATCH_PAUSE_MS);
    }
}

/**
 * Makes sure daily weather exists for every cell and date in the range.
 * Only cells with missing (or stale recent) days are fetched.
 *
 * @param db     pg pool/client
 * @param cells  [{ lat, lon }] on the 0.1 degree grid
 * @param fromDate, toDate  'YYYY-MM-DD' local dates
 */
async function ensureWeather(db, cells, fromDate, toDate) {
    if (!cells.length) return;

    const today = toLocalDate(new Date());
    const lastDate = minDate(toDate, today);
    if (fromDate > lastDate) return;

    const recentFrom = addDays(today, -(RECENT_REFRESH_DAYS - 1));

    const fresh = await db.query(
        `SELECT lat_grid::float8 AS lat, lon_grid::float8 AS lon, obs_date::text AS day
         FROM weather_observations
         WHERE obs_date BETWEEN $1::date AND $2::date
           AND (lat_grid, lon_grid) IN (
               SELECT * FROM unnest($3::numeric[], $4::numeric[])
           )
           AND NOT (
               obs_date >= $5::date
               AND fetched_at < NOW() - make_interval(hours => $6::int)
           )`,
        [
            fromDate,
            lastDate,
            cells.map((c) => Number(c.lat).toFixed(1)),
            cells.map((c) => Number(c.lon).toFixed(1)),
            recentFrom,
            RECENT_MAX_AGE_HOURS,
        ],
    );

    const have = new Set(fresh.rows.map((r) => `${cellKey(r.lat, r.lon)}|${r.day}`));
    const dates = datesBetween(fromDate, lastDate);
    const archiveCutoff = addDays(today, -ARCHIVE_LAG_DAYS);

    const needArchive = [];
    const needForecast = [];

    for (const cell of cells) {
        const key = cellKey(cell.lat, cell.lon);
        const missing = dates.filter((d) => !have.has(`${key}|${d}`));
        if (missing.some((d) => d <= archiveCutoff)) needArchive.push(cell);
        if (missing.some((d) => d > archiveCutoff)) needForecast.push(cell);
    }

    const archiveEnd = minDate(lastDate, archiveCutoff);
    if (needArchive.length && fromDate <= archiveEnd) {
        await fetchAndStore(db, OPEN_METEO_ARCHIVE_URL, needArchive, fromDate, archiveEnd);
    }

    const forecastStart = maxDate(fromDate, addDays(archiveCutoff, 1));
    if (needForecast.length && forecastStart <= lastDate) {
        await fetchAndStore(db, OPEN_METEO_FORECAST_URL, needForecast, forecastStart, lastDate);
    }
}

module.exports = { ensureWeather };
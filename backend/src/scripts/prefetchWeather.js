'use strict';

const { pool } = require('../db/pool');
const { ensureWeather } = require('../services/weatherService');

(async () => {
    const { rows } = await pool.query(
        `SELECT DISTINCT weather_lat::float8 AS lat, weather_lon::float8 AS lon
         FROM report_areas`,
    );
    console.log(`Fetching weather for ${rows.length} cells...`);
    await ensureWeather(pool, rows, '2026-07-30', '2026-09-21');
    console.log('Done.');
    await pool.end();
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
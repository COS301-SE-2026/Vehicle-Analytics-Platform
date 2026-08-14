
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

afterAll(async () => {
  await pool.end();
});

describe('CI pipeline smoke test', () => {
  it('connects to a real database (not a mock)', async () => {
    const res = await pool.query('SELECT current_database() AS db, 1 + 1 AS math');
    expect(res.rows[0].math).toBe(2);
    expect(res.rows[0].db).toBe(process.env.DB_NAME);
  });

  it('has the required extensions installed', async () => {
    const res = await pool.query(
      `SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'timescaledb')`
    );
    const names = res.rows.map((r) => r.extname);
    expect(names).toContain('postgis');
    expect(names).toContain('timescaledb');
  });

  it('ran bootstrap.sql before the migrations', async () => {
    const res = await pool.query(`SELECT to_regclass('public.roads') AS t`);
    expect(res.rows[0].t).not.toBeNull();
  });

  it('applied the migrations, including the late ones', async () => {
    const res = await pool.query(`
      SELECT
        to_regclass('public.clean_telemetry') IS NOT NULL AS has_tables,
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'safe_lat') AS has_helpers,
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_trip_history_with_events') AS has_v25
    `);
    const row = res.rows[0];
    expect(row.has_tables).toBe(true);
    expect(row.has_helpers).toBe(true);
    expect(row.has_v25).toBe(true);
  });

  it('executes real SQL against the migrated schema', async () => {
    const res = await pool.query(`SELECT safe_lat('-25.7479,28.2293') AS lat`);
    expect(parseFloat(res.rows[0].lat)).toBeCloseTo(-25.7479);
  });
});
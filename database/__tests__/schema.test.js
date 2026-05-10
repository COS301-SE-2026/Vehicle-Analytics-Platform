const { Client } = require('pg');

describe('Database Integrations', () => {
  let client;

  // Use environment variables (which match your CI pipeline and local docker instances)
  // For local docker testing, use 'admin' user with the password from .env or 'localdev' fallback
  const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'fleet_analytics',
    user: 'admin',
    password: process.env.POSTGRES_PASSWORD || 'localdev',
  };

  beforeAll(async () => {
    client = new Client(dbConfig);
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  test('tables were created successfully', async () => {
    // Check if the expected tables exist
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public'
    `);
    const tables = res.rows.map(row => row.table_name);
    
    expect(tables).toContain('raw_telemetry');
    expect(tables).toContain('clean_telemetry');
    expect(tables).toContain('vehicle_events');
    expect(tables).toContain('telemetry_errors');
  });
});


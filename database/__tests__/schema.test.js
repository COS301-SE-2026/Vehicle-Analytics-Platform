const { Client } = require('pg');

describe('Database Integrations', () => {
  let client;

  // Use environment variables (which match your CI pipeline and local docker instances)
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'fleet_analytics',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'localdev',
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


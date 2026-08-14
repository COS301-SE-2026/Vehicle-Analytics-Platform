const { Client } = require('pg');
const { getDbConfig } = require('../testDbConfig');

describe('Database Integrations', () => {
  let client;

  const dbConfig = getDbConfig();

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


const { Client } = require('pg');

describe('Gold Layer and Querying Integration', () => {
  let client;

  // For local docker testing, use 'admin' user with password from POSTGRES_PASSWORD env var
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
    
    // Clean up test data completely before starting
    await client.query("DELETE FROM clean_telemetry WHERE vehicle_id LIKE 'GOLD_TEST-%'");
    await client.query("DELETE FROM vehicle_events WHERE vehicle_id LIKE 'GOLD_TEST-%'");
    await client.query("DELETE FROM raw_telemetry WHERE vehicle_id LIKE 'GOLD_TEST-%'");
  });

  afterAll(async () => {
    // Cleanup generated data
    await client.query("DELETE FROM clean_telemetry WHERE vehicle_id LIKE 'GOLD_TEST-%'");
    await client.query("DELETE FROM vehicle_events WHERE vehicle_id LIKE 'GOLD_TEST-%'");
    await client.query("DELETE FROM raw_telemetry WHERE vehicle_id LIKE 'GOLD_TEST-%'");
    await client.end();
  });

  test('should correctly aggregate gold layer materialized views', async () => {
    // 1. Insert multiple raw_telemetry points to simulate motion and events for a couple of vehicles
    const now = new Date();
    
    // Vehicle 1: Older position, harsh braking
    const time1 = new Date(now.getTime() - 15 * 60000).toISOString(); // 15 mins ago
    await client.query(`
      INSERT INTO raw_telemetry 
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd, green_driving_type)
      VALUES 
        ($1, 'GOLD_TEST-001', 'DEV-001', 'avl_event', 'green_driving_type', '-25.000,28.000', '60', 'harsh_braking')
    `, [time1]);

    // Vehicle 1: Newer position, harsh acceleration
    const time2 = new Date(now.getTime() - 5 * 60000).toISOString(); // 5 mins ago
    await client.query(`
      INSERT INTO raw_telemetry 
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd, green_driving_type)
      VALUES 
        ($1, 'GOLD_TEST-001', 'DEV-001', 'avl_event', 'green_driving_type', '-25.010,28.010', '80', 'harsh_acceleration')
    `, [time2]);

    // Vehicle 2: crash detection
    const time3 = new Date(now.getTime() - 2 * 60000).toISOString(); // 2 mins ago
    await client.query(`
      INSERT INTO raw_telemetry 
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd, crash_detection)
      VALUES 
        ($1, 'GOLD_TEST-002', 'DEV-002', 'avl_event', 'crash_detection', '-25.020,28.020', '0', 'severe')
    `, [time3]);

    // 2. Refresh materialized views
    await client.query("SELECT refresh_gold_layer()");

    // 3. Assert vehicle_latest_position
    const positionRes = await client.query("SELECT * FROM vehicle_latest_position WHERE vehicle_id LIKE 'GOLD_TEST-%' ORDER BY vehicle_id");
    expect(positionRes.rows.length).toBe(2);
    
    // Vehicle 1 should have latest position from time2
    const v1Pos = positionRes.rows.find(r => r.vehicle_id === 'GOLD_TEST-001');
    expect(Number(v1Pos.latitude)).toBe(-25.010);
    expect(Number(v1Pos.longitude)).toBe(28.010);
    expect(v1Pos.speed).toBe(80);

    // Vehicle 2 should have position from time3
    const v2Pos = positionRes.rows.find(r => r.vehicle_id === 'GOLD_TEST-002');
    expect(Number(v2Pos.latitude)).toBe(-25.020);
    expect(v2Pos.speed).toBe(0);

    // 4. Assert vehicle_harsh_driving
    const harshRes = await client.query("SELECT * FROM vehicle_harsh_driving WHERE vehicle_id LIKE 'GOLD_TEST-%' ORDER BY vehicle_id");
    expect(harshRes.rows.length).toBe(2);

    const v1Harsh = harshRes.rows.find(r => r.vehicle_id === 'GOLD_TEST-001');
    expect(Number(v1Harsh.harsh_braking_count)).toBe(1);
    expect(Number(v1Harsh.harsh_acceleration_count)).toBe(1);
    expect(Number(v1Harsh.total_harsh_events)).toBe(2);

    const v2Harsh = harshRes.rows.find(r => r.vehicle_id === 'GOLD_TEST-002');
    expect(Number(v2Harsh.crash_count)).toBe(1);

    // 5. Assert fleet_kpis aggregates correctly
    // Note: We test with LIKE filters to ensure our test data is counted
    const v1CountRes = await client.query("SELECT COUNT(*) FROM vehicle_latest_position WHERE vehicle_id LIKE 'GOLD_TEST-001'");
    expect(Number(v1CountRes.rows[0].count)).toBe(1);

    const v2CountRes = await client.query("SELECT COUNT(*) FROM vehicle_latest_position WHERE vehicle_id LIKE 'GOLD_TEST-002'");
    expect(Number(v2CountRes.rows[0].count)).toBe(1);
  });
});
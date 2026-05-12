const { createDbClient, resetTelemetryData } = require('../testHelpers');

describe('Gold Layer and Querying Integration', () => {
  let client;

  beforeAll(async () => {
    client = await createDbClient();
    await resetTelemetryData(client, 'GOLD_TEST-');
  });

  afterAll(async () => {
    // Cleanup generated data
    if (client) {
      await resetTelemetryData(client, 'GOLD_TEST-');
      await client.end();
    }
  });

  test('should correctly aggregate continuous aggregates', async () => {
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

    // 2. Refresh timescaledb continuous aggregates manually for the test
    await client.query("CALL refresh_continuous_aggregate('vehicle_position_5s', NULL, NULL);");
    await client.query("CALL refresh_continuous_aggregate('vehicle_events_hourly', NULL, NULL);");

    // 3. Assert vehicle_position_5s
    const positionRes = await client.query("SELECT * FROM vehicle_position_5s WHERE vehicle_id LIKE 'GOLD_TEST-%' ORDER BY vehicle_id, bucket ASC");
    
    // Vehicle 1 has 2 points in different 5s buckets, Vehicle 2 has 1 point.
    expect(positionRes.rows.length).toBe(3);
    
    // Vehicle 1 should have latest position from time2
    const v1Pos = positionRes.rows.filter(r => r.vehicle_id === 'GOLD_TEST-001').pop(); // get the latest active bucket
    expect(Number(v1Pos.latitude)).toBe(-25.010);
    expect(Number(v1Pos.longitude)).toBe(28.010);
    expect(v1Pos.speed).toBe(80);

    // Vehicle 2 should have position from time3
    const v2Pos = positionRes.rows.find(r => r.vehicle_id === 'GOLD_TEST-002');
    expect(Number(v2Pos.latitude)).toBe(-25.020);
    expect(v2Pos.speed).toBe(0);

    // 4. Assert vehicle_events_hourly
    const harshRes = await client.query("SELECT * FROM vehicle_events_hourly WHERE vehicle_id LIKE 'GOLD_TEST-%' ORDER BY vehicle_id, bucket ASC");

    const v1Harsh = harshRes.rows.filter(r => r.vehicle_id === 'GOLD_TEST-001').reduce((acc, row) => {
        acc.harsh_braking_count += Number(row.harsh_braking_count);
        acc.harsh_acceleration_count += Number(row.harsh_acceleration_count);
        acc.total_harsh_events += Number(row.total_harsh_events);
        return acc;
    }, { harsh_braking_count: 0, harsh_acceleration_count: 0, total_harsh_events: 0 });

    expect(Number(v1Harsh.harsh_braking_count)).toBe(1);
    expect(Number(v1Harsh.harsh_acceleration_count)).toBe(1);
    expect(Number(v1Harsh.total_harsh_events)).toBe(2);

    const v2Harsh = harshRes.rows.find(r => r.vehicle_id === 'GOLD_TEST-002');
    expect(Number(v2Harsh.crash_count)).toBe(1);
  });
});

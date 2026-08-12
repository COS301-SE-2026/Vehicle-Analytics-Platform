const { createDbClient, resetTelemetryData } = require('../testHelpers');

describe('Gold Layer and Querying Integration', () => {
  let client;
  // Set timeout to 30 seconds for all hooks and tests in this file
  jest.setTimeout(30000);

  async function safeRefresh(viewName) {
    for (let i = 0; i < 5; i++) {
      try {
        await client.query(`CALL refresh_continuous_aggregate('${viewName}', NULL, NULL);`);
        return;
      } catch (error) {
        if (error.message && error.message.includes('concurrent refresh')) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw error;
        }
      }
    }
    throw new Error(`Failed to refresh ${viewName} after 5 retries due to concurrent refreshes.`);
  }

  beforeAll(async () => {
    client = await createDbClient();
    await resetTelemetryData(client, 'GOLD_TEST-');
  }, 30000);

  afterAll(async () => {
    // Cleanup generated data
    if (client) {
      await resetTelemetryData(client, 'GOLD_TEST-');
      await client.end();
    }
  }, 30000);

  test('should correctly aggregate continuous aggregates', async () => {
    // 1. Insert multiple raw_telemetry points to simulate motion and events for a couple of vehicles
    const now = new Date();
    
    // Vehicle 1: Older position, harsh braking
    const time1 = new Date(now.getTime() - 15 * 60000).toISOString(); // 15 mins ago
    await client.query(`
      INSERT INTO raw_telemetry 
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd,total_odometer, ignition, movement, green_driving_type)
      VALUES 
        ($1, 'GOLD_TEST-001', 'DEV-001', 'avl_event', 'green_driving_type', '-25.000,28.000', '60', '92537167', 'Ignition On', 'Movement On', 'harsh_braking')
    `, [time1]);

    // Vehicle 1: Newer position, harsh acceleration
    const time2 = new Date(now.getTime() - 5 * 60000).toISOString(); // 5 mins ago
    await client.query(`
      INSERT INTO raw_telemetry 
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd,total_odometer, ignition, movement, green_driving_type)
      VALUES 
        ($1, 'GOLD_TEST-001', 'DEV-001', 'avl_event', 'green_driving_type', '-25.010,28.010', '80', '92537168', 'Ignition On', 'Movement On', 'harsh_acceleration')
    `, [time2]);

    // Vehicle 2: crash detection
    const time3 = new Date(now.getTime() - 2 * 60000).toISOString(); // 2 mins ago
    await client.query(`
      INSERT INTO raw_telemetry 
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd,total_odometer, ignition, movement, crash_detection)
      VALUES 
        ($1, 'GOLD_TEST-002', 'DEV-002', 'avl_event', 'crash_detection', '-25.020,28.020', '0', '92537169', 'Ignition Off', 'Movement Off', 'severe')
    `, [time3]);

    // 2. Refresh timescaledb continuous aggregates manually for the test
    await safeRefresh('vehicle_events_hourly');

    // 3. Assert current_vehicle_position
    const positionRes = await client.query("SELECT * FROM current_vehicle_position WHERE id LIKE 'GOLD_TEST-%' ORDER BY id ASC");
    
    expect(positionRes.rows.length).toBe(2);
    
    const v1Pos = positionRes.rows.filter(r => r.id === 'GOLD_TEST-001').pop(); 
    expect(Number(v1Pos.latitude)).toBe(-25.010);
    expect(Number(v1Pos.longitude)).toBe(28.010);
    expect(v1Pos.ignition).toBe('Ignition On');
    expect(v1Pos.movement).toBe('Movement On');
    expect(Number(v1Pos.total_odometer)).toBe(92537168);
    expect(v1Pos.speed).toBe(80);

    const v2Pos = positionRes.rows.find(r => r.id === 'GOLD_TEST-002');
    expect(Number(v2Pos.latitude)).toBe(-25.020);
    expect(Number(v2Pos.total_odometer)).toBe(92537169);
    expect(v2Pos.speed).toBe(0);

    // 4. Assert vehicle_events_hourly

    await client.query(`
      CALL refresh_continuous_aggregate(
        'vehicle_events_hourly', 
        NOW() - INTERVAL '1 day', 
        NOW() + INTERVAL '1 hour'
      );
    `);

    const harshRes = await client.query("SELECT vehicle_id, harsh_braking_count::INTEGER, harsh_acceleration_count::INTEGER, alerts_today::INTEGER, crash_count::INTEGER FROM vehicle_events_hourly WHERE vehicle_id LIKE 'GOLD_TEST-%' ORDER BY vehicle_id, bucket ASC");

    const v1Harsh = harshRes.rows.filter(r => r.vehicle_id === 'GOLD_TEST-001').reduce((acc, row) => {
        acc.harsh_braking_count += Number(row.harsh_braking_count);
        acc.harsh_acceleration_count += Number(row.harsh_acceleration_count);
        acc.alerts_today += Number(row.alerts_today);
        return acc;
    }, { harsh_braking_count: 0, harsh_acceleration_count: 0, alerts_today: 0 });

    expect(Number(v1Harsh.harsh_braking_count)).toBe(1);
    expect(Number(v1Harsh.harsh_acceleration_count)).toBe(1);
    expect(Number(v1Harsh.alerts_today)).toBe(2);

    const v2Harsh = harshRes.rows.find(r => r.vehicle_id === 'GOLD_TEST-002');
    expect(Number(v2Harsh.crash_count)).toBe(1);
  }, 60000);

  test('should correctly aggregate vehicle_daily_distance', async () => {
    await resetTelemetryData(client, 'GOLD_TEST-');

    const now = new Date();
    const baseTime = new Date(now.getTime() - 30 * 1000);
    const time1 = new Date(baseTime.getTime() - 1000).toISOString();
    const time2 = new Date(baseTime.getTime() + 1000).toISOString();
    const time3 = new Date(baseTime.getTime() + 2000).toISOString();

    await client.query(`
      INSERT INTO raw_telemetry
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd, total_odometer, ignition, movement)
      VALUES
        ($1, 'GOLD_TEST-020', 'DEV-020', 'avl', '', '-25.000,28.000', '40', '100000', 'Ignition On', 'Movement On'),
        ($2, 'GOLD_TEST-020', 'DEV-020', 'avl', '', '-25.001,28.001', '45', '101500', 'Ignition On', 'Movement On'),
        ($3, 'GOLD_TEST-020', 'DEV-020', 'avl', '', '-25.002,28.002', '50', '103000', 'Ignition On', 'Movement On')
    `, [time1, time2, time3]);

    await safeRefresh('vehicle_daily_distance');

    const distanceRes = await client.query("SELECT * FROM vehicle_daily_distance WHERE vehicle_id = 'GOLD_TEST-020' ORDER BY bucket DESC LIMIT 1");
    expect(distanceRes.rows.length).toBe(1);

    const row = distanceRes.rows[0];
    expect(Number(row.start_odometer)).toBe(101500);
    expect(Number(row.end_odometer)).toBe(103000);
    expect(Number(row.distance_km)).toBe(3);
  }, 60000);

  test('should clamp negative distance to zero for odometer rollback', async () => {
    await resetTelemetryData(client, 'GOLD_TEST-');

    const now = new Date();
    const baseTime = new Date(now.getTime() - 30 * 1000);
    const time1 = new Date(baseTime.getTime() - 1000).toISOString();
    const time2 = new Date(baseTime.getTime() + 1000).toISOString();

    await client.query(`
      INSERT INTO raw_telemetry
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd, total_odometer, ignition, movement)
      VALUES
        ($1, 'GOLD_TEST-021', 'DEV-021', 'avl', '', '-25.000,28.000', '40', '100000', 'Ignition On', 'Movement On'),
        ($2, 'GOLD_TEST-021', 'DEV-021', 'avl', '', '-25.001,28.001', '45', '99000', 'Ignition On', 'Movement On')
    `, [time1, time2]);

    await safeRefresh('vehicle_daily_distance');

    const distanceRes = await client.query("SELECT * FROM vehicle_daily_distance WHERE vehicle_id = 'GOLD_TEST-021' ORDER BY bucket DESC LIMIT 1");
    expect(distanceRes.rows.length).toBe(1);
    expect(Number(distanceRes.rows[0].distance_km)).toBe(0);
  }, 60000);
});

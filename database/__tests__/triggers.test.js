const { createDbClient, resetTelemetryData } = require('../testHelpers');

describe('Database Triggers Integration', () => {
  let client;

  beforeAll(async () => {
    client = await createDbClient('fleet_analytics');
    await resetTelemetryData(client, 'TEST-');
  });

  afterAll(async () => {
    // Cleanup generated data
    await resetTelemetryData(client, 'TEST-');
    await client.end();
  });

  test('should parse and insert standard avl records into clean_telemetry', async () => {
    const time = '2026-05-04T10:00:00.000Z';
    
    // 1. Insert raw telemetry
    await client.query(`
      INSERT INTO raw_telemetry 
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd, total_odometer)
      VALUES 
        ($1, 'TEST-001', 'DEV-001', 'avl', '', '-25.837,28.172', '40', '92537167')
    `, [time]);

    // Give the trigger time to fire (even though it should be immediate)
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. Assert clean_telemetry was populated correctly via trigger
    const cleanRes = await client.query("SELECT * FROM clean_telemetry WHERE vehicle_id = 'TEST-001'");
    expect(cleanRes.rows.length).toBe(1);
    expect(Number(cleanRes.rows[0].latitude)).toBe(-25.837);
    expect(Number(cleanRes.rows[0].longitude)).toBe(28.172);
    expect(cleanRes.rows[0].speed).toBe(40);
    expect(Number(cleanRes.rows[0].total_odometer)).toBe(92537167);

    // 3. Assert vehicle_events is empty since it was just 'avl'
    const eventRes = await client.query("SELECT * FROM vehicle_events WHERE vehicle_id = 'TEST-001'");
    expect(eventRes.rows.length).toBe(0);
  });

  test('should route avl_event records to both clean_telemetry and vehicle_events', async () => {
    const time = '2026-05-04T10:05:00.000Z';
    
    // 1. Insert an avl_event
    await client.query(`
      INSERT INTO raw_telemetry 
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd, total_odometer, green_driving_type)
      VALUES 
        ($1, 'TEST-002', 'DEV-002', 'avl_event', 'green_driving_type', '-25.829,28.169', '32', '92536129', 'harsh_acceleration')
    `, [time]);

    // Give the trigger time to fire
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. Assert it's in the clean route breadcrumb table
    const cleanRes = await client.query("SELECT * FROM clean_telemetry WHERE vehicle_id = 'TEST-002'");
    expect(cleanRes.rows.length).toBe(1);

    // 3. Assert the specific event details made it into the vehicle_events table
    const eventRes = await client.query("SELECT * FROM vehicle_events WHERE vehicle_id = 'TEST-002'");
    expect(eventRes.rows.length).toBe(1);
    expect(eventRes.rows[0].event_category).toBe('green_driving_type');
    expect(eventRes.rows[0].event_detail).toBe('harsh_acceleration');
    expect(eventRes.rows[0].speed).toBe(32);
  });

  test('should catch parsing errors and insert them into telemetry_errors', async () => {
    const time = '2026-05-04T10:10:00.000Z';
    
    // 1. Insert bad data (invalid format for speed to force a SQL cast error)
    await client.query(`
      INSERT INTO raw_telemetry 
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd, total_odometer)
      VALUES 
        ($1, 'TEST-003', 'DEV-003', 'avl', '', '-25.829,28.169', 'invalid_speed', '123')
    `, [time]);

    // Give the trigger time to fire
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. Assert it triggered the exception block and logged it in telemetry_errors
    const errorRes = await client.query("SELECT * FROM telemetry_errors WHERE vehicle_id = 'TEST-003'");
    expect(errorRes.rows.length).toBe(1);
    expect(errorRes.rows[0].error_message).toContain('invalid input syntax for type integer: "invalid_speed"');
    
    // 3. Assert it safely skipped clean_telemetry since it failed to parse
    const cleanRes = await client.query("SELECT * FROM clean_telemetry WHERE vehicle_id = 'TEST-003'");
    expect(cleanRes.rows.length).toBe(0);
  });
});
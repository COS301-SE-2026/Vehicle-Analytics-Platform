const { createDbClient, resetTelemetryData } = require('../testHelpers');

describe('Database Triggers Integration', () => {let client;

  beforeAll(async () => {
    client = await createDbClient();
    await resetTelemetryData(client, 'TEST-');
    await client.query("DELETE FROM vehicles WHERE vehicle_id LIKE 'TEST-%'");
  });

  afterAll(async () => {
    // Cleanup generated data
    if (client) {
      await resetTelemetryData(client, 'TEST-');
      await client.end();
    }
  });

  test('should parse and insert standard avl records into clean_telemetry', async () => {
    const time = new Date().toISOString();
    const vehicleId = 'TEST-TRIGGER-001';
    const deviceId = 'DEV-TRIGGER-001';
    
    // 1. Insert raw telemetry
    await client.query(`
      INSERT INTO raw_telemetry 
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd, total_odometer, ignition, movement)
      VALUES 
        ($1, $2, $3, 'avl', '', '-25.837,28.172', '40', '92537167', 'Ignition On', 'Movement On')
    `, [time, vehicleId, deviceId]);

    // Give the trigger time to fire (even though it should be immediate)
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. Assert clean_telemetry was populated correctly via trigger
    const cleanRes = await client.query("SELECT * FROM clean_telemetry WHERE vehicle_id = $1", [vehicleId]);
    expect(cleanRes.rows.length).toBe(1);
    expect(Number(cleanRes.rows[0].latitude)).toBe(-25.837);
    expect(Number(cleanRes.rows[0].longitude)).toBe(28.172);
    expect(cleanRes.rows[0].speed).toBe(40);
    expect(Number(cleanRes.rows[0].total_odometer)).toBe(92537167);
    expect(cleanRes.rows[0].ignition).toBe('Ignition On');
    expect(cleanRes.rows[0].movement).toBe('Movement On');

    // 3. Assert vehicle_events is empty since it was just 'avl'
    const eventRes = await client.query("SELECT * FROM vehicle_events WHERE vehicle_id = $1", [vehicleId]);
    expect(eventRes.rows.length).toBe(0);
  });

  test('should route avl_event records to both clean_telemetry and vehicle_events', async () => {
    const time = new Date().toISOString();
    const vehicleId = 'TEST-TRIGGER-002';
    const deviceId = 'DEV-TRIGGER-002';
    
    // 1. Insert an avl_event
    await client.query(`
      INSERT INTO raw_telemetry 
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd, total_odometer, ignition, movement, green_driving_type)
      VALUES 
        ($1, $2, $3, 'avl_event', 'green_driving_type', '-25.829,28.169', '32', '92536129', 'Ignition Off', 'Movement Off', 'harsh_acceleration')
    `, [time, vehicleId, deviceId]);

    // Give the trigger time to fire
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. Assert it's in the clean route breadcrumb table
    const cleanRes = await client.query("SELECT * FROM clean_telemetry WHERE vehicle_id = $1", [vehicleId]);
    expect(cleanRes.rows.length).toBe(1);

    // 3. Assert the specific event details made it into the vehicle_events table
    const eventRes = await client.query("SELECT * FROM vehicle_events WHERE vehicle_id = $1", [vehicleId]);
    expect(eventRes.rows.length).toBe(1);
    expect(eventRes.rows[0].event_category).toBe('green_driving_type');
    expect(eventRes.rows[0].event_detail).toBe('harsh_acceleration');
    expect(eventRes.rows[0].speed).toBe(32);

    const currentPositionRes = await client.query("SELECT * FROM current_vehicle_position WHERE vehicle_id = $1", [vehicleId]);
    expect(currentPositionRes.rows[0].ignition).toBe('Ignition Off');
    expect(currentPositionRes.rows[0].movement).toBe('Movement Off');
  });

});
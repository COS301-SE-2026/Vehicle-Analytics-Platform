const { createDbClient, resetTelemetryData } = require('../testHelpers');

/**
 * REMOVED: the vehicle_events_hourly test.
 *
 * That continuous aggregate came from V5__create_gold_layer.sql, which was
 * deleted during migration deduplication -- it refreshed on a schedule
 * forever and nothing in the application ever queried it. The test asserted
 * on harsh_braking_count / harsh_acceleration_count / alerts_today /
 * crash_count, all columns of that view.
 *
 * If per-hour event rollups are wanted back, the view needs recreating
 * first; a test for an object no migration builds can only ever fail.
 *
 * The current_vehicle_position assertions from that test are kept below --
 * they were testing the ingestion trigger, not the aggregate.
 */
describe('Gold Layer and Querying Integration', () => {
  let client;
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
    if (client) {
      await resetTelemetryData(client, 'GOLD_TEST-');
      await client.end();
    }
  }, 30000);

  test('should maintain current_vehicle_position with the newest reading per vehicle', async () => {
    const now = new Date();

    const time1 = new Date(now.getTime() - 15 * 60000).toISOString();
    await client.query(`
      INSERT INTO raw_telemetry
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd, total_odometer, ignition, movement, green_driving_type)
      VALUES
        ($1, 'GOLD_TEST-001', 'DEV-001', 'avl_event', 'green_driving_type', '-25.000,28.000', '60', '92537167', 'Ignition On', 'Movement On', 'harsh_braking')
    `, [time1]);

    const time2 = new Date(now.getTime() - 5 * 60000).toISOString();
    await client.query(`
      INSERT INTO raw_telemetry
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd, total_odometer, ignition, movement, green_driving_type)
      VALUES
        ($1, 'GOLD_TEST-001', 'DEV-001', 'avl_event', 'green_driving_type', '-25.010,28.010', '80', '92537168', 'Ignition On', 'Movement On', 'harsh_acceleration')
    `, [time2]);

    const time3 = new Date(now.getTime() - 2 * 60000).toISOString();
    await client.query(`
      INSERT INTO raw_telemetry
        (time, vehicle_id, device_id, measurement, event, lat_lng, spd, total_odometer, ignition, movement, crash_detection)
      VALUES
        ($1, 'GOLD_TEST-002', 'DEV-002', 'avl_event', 'crash_detection', '-25.020,28.020', '0', '92537169', 'Ignition Off', 'Movement Off', 'severe')
    `, [time3]);

    // vehicle_id, NOT id -- current_vehicle_position has no `id` column.
    const positionRes = await client.query(
      "SELECT * FROM current_vehicle_position WHERE vehicle_id LIKE 'GOLD_TEST-%' ORDER BY vehicle_id ASC"
    );
    expect(positionRes.rows.length).toBe(2);

    // The newer of the two rows must win -- the upsert guard rejects any
    // reading older than the one already stored.
    const v1Pos = positionRes.rows.find(r => r.vehicle_id === 'GOLD_TEST-001');
    expect(Number(v1Pos.latitude)).toBe(-25.010);
    expect(Number(v1Pos.longitude)).toBe(28.010);
    expect(v1Pos.ignition).toBe('Ignition On');
    expect(v1Pos.movement).toBe('Movement On');
    expect(Number(v1Pos.total_odometer)).toBe(92537168);
    expect(v1Pos.speed).toBe(80);

    const v2Pos = positionRes.rows.find(r => r.vehicle_id === 'GOLD_TEST-002');
    expect(Number(v2Pos.latitude)).toBe(-25.020);
    expect(Number(v2Pos.total_odometer)).toBe(92537169);
    expect(v2Pos.speed).toBe(0);

    // The events themselves still route to vehicle_events -- this is what
    // the deleted hourly aggregate used to summarise.
    const eventRes = await client.query(`
      SELECT event_category, event_detail FROM vehicle_events
      WHERE vehicle_id LIKE 'GOLD_TEST-%' ORDER BY time ASC
    `);
    expect(eventRes.rows.length).toBe(3);
    expect(eventRes.rows.map(r => r.event_detail))
      .toEqual(['harsh_braking', 'harsh_acceleration', 'severe']);
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
        ($1, 'GOLD_TEST-020', 'DEV-020', 'avl', NULL, '-25.000,28.000', '40', '100000', 'Ignition On', 'Movement On'),
        ($2, 'GOLD_TEST-020', 'DEV-020', 'avl', NULL, '-25.001,28.001', '45', '101500', 'Ignition On', 'Movement On'),
        ($3, 'GOLD_TEST-020', 'DEV-020', 'avl', NULL, '-25.002,28.002', '50', '103000', 'Ignition On', 'Movement On')
    `, [time1, time2, time3]);

    await safeRefresh('vehicle_daily_distance');

    // `day`, NOT `bucket`. The 5-minute and 10-second rollups that used a
    // `bucket` column were removed; only the daily aggregate remains, and
    // its time column is named day.
    const distanceRes = await client.query(
      "SELECT * FROM vehicle_daily_distance WHERE vehicle_id = 'GOLD_TEST-020' ORDER BY day DESC LIMIT 1"
    );
    expect(distanceRes.rows.length).toBe(1);

    const row = distanceRes.rows[0];
    expect(Number(row.start_odometer)).toBe(100000);
    expect(Number(row.end_odometer)).toBe(103000);
    // Odometer is in metres; distance_km divides by 1000.
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
        ($1, 'GOLD_TEST-021', 'DEV-021', 'avl', NULL, '-25.000,28.000', '40', '100000', 'Ignition On', 'Movement On'),
        ($2, 'GOLD_TEST-021', 'DEV-021', 'avl', NULL, '-25.001,28.001', '45', '99000', 'Ignition On', 'Movement On')
    `, [time1, time2]);

    await safeRefresh('vehicle_daily_distance');

    const distanceRes = await client.query(
      "SELECT * FROM vehicle_daily_distance WHERE vehicle_id = 'GOLD_TEST-021' ORDER BY day DESC LIMIT 1"
    );
    expect(distanceRes.rows.length).toBe(1);
    // GREATEST(0, ...) in the aggregate -- a device replacement or odometer
    // reset would otherwise contribute negative distance to the daily total.
    expect(Number(distanceRes.rows[0].distance_km)).toBe(0);
  }, 60000);
});
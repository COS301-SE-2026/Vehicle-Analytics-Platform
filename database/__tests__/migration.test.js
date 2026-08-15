const { Pool } = require('pg');
const { getDbConfig } = require('./testDbConfig');

const pool = new Pool(getDbConfig());

describe('Database Schema, Functions, and Trigger Integration Tests', () => {
  beforeAll(async () => {
    const applied = await pool.query(`
      SELECT
        to_regclass('public.clean_telemetry')            IS NOT NULL AS has_tables,
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'safe_lat')        AS has_helpers,
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_vehicle_status') AS has_status,
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_trip_history_with_events') AS has_last
    `);
    const a = applied.rows[0];
    if (!a.has_tables || !a.has_helpers || !a.has_status || !a.has_last) {
      throw new Error(
        `Migrations did not fully apply: ${JSON.stringify(a)}. ` +
        `Run bootstrap.sql (creates OSM stub tables) then every V*.sql in numeric order ` +
        `with ON_ERROR_STOP=1.`
      );
    }

    await pool.query(`
      TRUNCATE TABLE users, raw_telemetry, clean_telemetry, vehicle_events, telemetry_errors, current_vehicle_position, vehicles CASCADE;
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  // TEST GROUP 1: User Management & Triggers
  describe('Users Table & Triggers', () => {
    it('should auto-update updated_at timestamp when a user is modified', async () => {
      const insertRes = await pool.query(`
        INSERT INTO users (cognito_sub, name, email, role)
        VALUES ('sub-test-123', 'Test Driver', 'driver@vapor.com', 'viewer')
        RETURNING id, updated_at;
      `);

      const userId = insertRes.rows[0].id;
      const originalUpdatedAt = insertRes.rows[0].updated_at;

      await new Promise((resolve) => setTimeout(resolve, 100));

      await pool.query(`UPDATE users SET name = 'Updated Driver Name' WHERE id = $1;`, [userId]);

      const selectRes = await pool.query(`SELECT updated_at FROM users WHERE id = $1;`, [userId]);
      const newUpdatedAt = selectRes.rows[0].updated_at;

      expect(new Date(newUpdatedAt).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());
    });
  });

  // TEST GROUP 2: Parsing Helper Functions
  describe('Safe Parsing Helper Functions', () => {
    it('should correctly parse valid and invalid coordinate strings', async () => {
      const res = await pool.query(`
        SELECT
          safe_lat('-25.7479,28.2293') AS valid_lat,
          safe_lng('-25.7479,28.2293') AS valid_lng,
          safe_lat('invalid_coord_string') AS invalid_lat,
          safe_int('120') AS valid_int,
          safe_int('not_a_number') AS invalid_int;
      `);

      const row = res.rows[0];
      expect(parseFloat(row.valid_lat)).toBeCloseTo(-25.7479);
      expect(parseFloat(row.valid_lng)).toBeCloseTo(28.2293);
      expect(row.invalid_lat).toBeNull();
      expect(row.valid_int).toBe(120);
      expect(row.invalid_int).toBeNull();
    });
  });

  // TEST GROUP 3: Telemetry Batch Pipeline Trigger
  describe('parse_and_insert_telemetry_batch Trigger', () => {
    async function assertNoBatchFailure() {
      const res = await pool.query(`
        SELECT error_message FROM telemetry_errors
        WHERE error_message LIKE 'Batch ingestion failure%'
      `);
      expect(res.rows.map(r => r.error_message)).toEqual([]);
    }

    it('should parse raw_telemetry and populate clean_telemetry, vehicles, and current_vehicle_position', async () => {
      const testVehicleId = 'VEHICLE_TEST_001';
      const timestamp = new Date().toISOString();
      await pool.query(`
        INSERT INTO raw_telemetry (time, vehicle_id, measurement, device_id, event, lat_lng, spd, total_odometer, ignition, movement)
        VALUES ($1, $2, 'avl', 'DEV_001', NULL, '-25.7479,28.2293', '80', '150000', 'Ignition On', 'Movement On');
      `, [timestamp, testVehicleId]);

      await assertNoBatchFailure();

      const vehicleCheck = await pool.query(`SELECT * FROM vehicles WHERE vehicle_id = $1;`, [testVehicleId]);
      expect(vehicleCheck.rows.length).toBe(1);

      const cleanCheck = await pool.query(`SELECT * FROM clean_telemetry WHERE vehicle_id = $1;`, [testVehicleId]);
      expect(cleanCheck.rows.length).toBe(1);
      expect(cleanCheck.rows[0].speed).toBe(80);
      expect(parseFloat(cleanCheck.rows[0].latitude)).toBeCloseTo(-25.7479);
      expect(cleanCheck.rows[0].location).not.toBeNull();

      const posCheck = await pool.query(`SELECT * FROM current_vehicle_position WHERE vehicle_id = $1;`, [testVehicleId]);
      expect(posCheck.rows.length).toBe(1);
      expect(posCheck.rows[0].speed).toBe(80);
    });

    it('should extract safety events into vehicle_events table', async () => {
      const testVehicleId = 'VEHICLE_TEST_002';
      const timestamp = new Date().toISOString();

      await pool.query(`
        INSERT INTO raw_telemetry (time, vehicle_id, measurement, device_id, event, green_driving_type, lat_lng, spd)
        VALUES ($1, $2, 'avl_event', 'DEV_002', 'green_driving_type', 'harsh_braking', '-25.7479,28.2293', '65');
      `, [timestamp, testVehicleId]);

      await assertNoBatchFailure();

      const eventCheck = await pool.query(`SELECT * FROM vehicle_events WHERE vehicle_id = $1;`, [testVehicleId]);
      expect(eventCheck.rows.length).toBe(1);
      expect(eventCheck.rows[0].event_category).toBe('green_driving_type');
      expect(eventCheck.rows[0].event_detail).toBe('harsh_braking');
    });

    it('should keep both an avl and an avl_event that share a timestamp', async () => {
      const testVehicleId = 'VEHICLE_TEST_003';
      const timestamp = new Date().toISOString();

      await pool.query(`
        INSERT INTO raw_telemetry (time, vehicle_id, measurement, device_id, event, crash_detection, lat_lng, spd, ignition, movement)
        VALUES
          ($1, $2, 'avl',       'DEV_003', NULL,              NULL,
           '-25.7479,28.2293', '60', 'Ignition On', 'Movement On'),
          ($1, $2, 'avl_event', 'DEV_003', 'crash_detection', 'real crash detected (device is calibrated)',
           '-25.7479,28.2293', '60', 'Ignition On', 'Movement On');
      `, [timestamp, testVehicleId]);

      await assertNoBatchFailure();

      const cleanCheck = await pool.query(
        `SELECT measurement FROM clean_telemetry WHERE vehicle_id = $1 ORDER BY measurement;`,
        [testVehicleId]
      );
      expect(cleanCheck.rows.map(r => r.measurement)).toEqual(['avl', 'avl_event']);
    });

    it('should keep the newest reading in current_vehicle_position regardless of insert order', async () => {
      const testVehicleId = 'VEHICLE_TEST_004';
      const newer = new Date().toISOString();
      const older = new Date(Date.now() - 60000).toISOString();

      await pool.query(`
        INSERT INTO raw_telemetry (time, vehicle_id, measurement, device_id, event, lat_lng, spd, total_odometer, ignition, movement)
        VALUES
          ($1, $3, 'avl', 'DEV_004', NULL, '-25.7600,28.2400', '80', '200000', 'Ignition On', 'Movement On'),
          ($2, $3, 'avl', 'DEV_004', NULL, '-25.7400,28.2200', '20', '199000', 'Ignition On', 'Movement On');
      `, [newer, older, testVehicleId]);

      await assertNoBatchFailure();

      const posCheck = await pool.query(
        `SELECT speed FROM current_vehicle_position WHERE vehicle_id = $1;`, [testVehicleId]
      );
      expect(posCheck.rows[0].speed).toBe(80);
    });

    it('should log malformed telemetry records into telemetry_errors table', async () => {
      const testVehicleId = 'VEHICLE_TEST_BAD';
      const timestamp = new Date().toISOString();

      await pool.query(`
        INSERT INTO raw_telemetry (time, vehicle_id, measurement, lat_lng, spd)
        VALUES ($1, $2, 'avl', 'malformed_coordinate_without_comma', 'not_a_number_speed');
      `, [timestamp, testVehicleId]);

      const errorCheck = await pool.query(
        `SELECT * FROM telemetry_errors WHERE vehicle_id = $1;`, [testVehicleId]
      );
      expect(errorCheck.rows.length).toBeGreaterThan(0);
      expect(errorCheck.rows[0].error_message).toContain('Unparseable numeric field');
      await assertNoBatchFailure();
    });
  });

  // TEST GROUP 4: Vehicle Status Logic
  describe('get_vehicle_status Function', () => {
    it('should correctly classify vehicle activity status', async () => {
      const res = await pool.query(`
        SELECT
          get_vehicle_status(NOW(), 'Movement On', 50) AS active_status,
          get_vehicle_status(NOW(), 'Movement Off', 0) AS idle_status,
          get_vehicle_status(NOW() - INTERVAL '10 minutes', 'Movement On', 50) AS offline_status,
          get_vehicle_status(NULL, 'Movement On', 50) AS null_status;
      `);

      const row = res.rows[0];
      expect(row.active_status).toBe('active');
      expect(row.idle_status).toBe('idle');
      expect(row.offline_status).toBe('offline');
      expect(row.null_status).toBe('offline');
    });

    it('should be correct regardless of session timezone', async () => {
      const client = await pool.connect();
      try {
        await client.query(`SET TIME ZONE 'Pacific/Kiritimati'`); // UTC+14
        const res = await client.query(`
          SELECT get_vehicle_status(NOW(), 'Movement On', 50) AS active_status,
                 get_vehicle_status(NOW() - INTERVAL '10 minutes', 'Movement On', 50) AS offline_status;
        `);
        expect(res.rows[0].active_status).toBe('active');
        expect(res.rows[0].offline_status).toBe('offline');
      } finally {
        await client.query(`SET TIME ZONE 'UTC'`);
        client.release();
      }
    });
  });

  // TEST GROUP 5: Schema invariants
  describe('Schema invariants', () => {
    it.each([
      ['raw_telemetry',   'UNIQUE ("time", vehicle_id, measurement, event)'],
      ['clean_telemetry', 'UNIQUE ("time", vehicle_id, measurement)'],
      ['vehicle_events',  'UNIQUE ("time", vehicle_id, event_category)'],
    ])('%s has the unique constraint the parse trigger targets', async (table, expected) => {
      const res = await pool.query(`
        SELECT pg_get_constraintdef(oid) AS def
        FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'u'
      `, [table]);
      expect(res.rows.map(r => r.def)).toContain(expected);
    });

    it('current_vehicle_position is a table, not a view', async () => {
      const res = await pool.query(
        `SELECT relkind FROM pg_class WHERE relname = 'current_vehicle_position'`
      );
      expect(res.rows[0].relkind).toBe('r');
    });

    it('telemetry tables are hypertables', async () => {
      const res = await pool.query(`
        SELECT hypertable_name FROM timescaledb_information.hypertables
        WHERE hypertable_name = ANY($1)
      `, [['raw_telemetry', 'clean_telemetry', 'vehicle_events']]);
      expect(res.rows.map(r => r.hypertable_name).sort())
        .toEqual(['clean_telemetry', 'raw_telemetry', 'vehicle_events']);
    });
  });
});
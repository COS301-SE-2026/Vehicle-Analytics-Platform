jest.unmock('pg');

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const generateTestToken = require('../tests/generateToken');

describe('Vehicle endpoints scoped to assigned group', () => {
  let adminToken;
  let managerToken;
  let groupAId;
  let groupBId;

  const vehicleA = 'COVTEST-VEH-A';    // assigned to group A
  const vehicleB = 'COVTEST-VEH-B';    // assigned to group B
  const vehicleUnassigned = 'COVTEST-VEH-U';

  async function cleanup() {
    await pool.query('DELETE FROM vehicles WHERE vehicle_id = ANY($1::text[])',
      [[vehicleA, vehicleB, vehicleUnassigned]]);

    await pool.query(`
      DELETE FROM fleet_manager_assignments
      WHERE fleet_manager_id IN (
        SELECT id FROM users WHERE email LIKE 'covtest-scope-%'
      )
    `);

    await pool.query(`
      DELETE FROM fleet_groups WHERE name LIKE 'COVTEST-SCOPE-%'
    `);

    await pool.query(`
      DELETE FROM users WHERE email LIKE 'covtest-scope-%'
    `);
  }

  beforeAll(async () => {
    await cleanup();

    // Admin user (unrestricted)
    const admin = await pool.query(`
      INSERT INTO users (cognito_sub, name, email, role, is_active)
      VALUES ('covtest-scope-admin-sub', 'COVTEST SCOPE Admin',
              'covtest-scope-admin@example.com', 'admin', true)
      RETURNING id
    `);

    // Manager user
    const manager = await pool.query(`
      INSERT INTO users (cognito_sub, name, email, role, is_active)
      VALUES ('covtest-scope-manager-sub', 'COVTEST SCOPE Manager',
              'covtest-scope-manager@example.com', 'fleet_manager', true)
      RETURNING id
    `);

    // Two fleet groups
    const groupA = await pool.query(`
      INSERT INTO fleet_groups (name) VALUES ('COVTEST-SCOPE-A') RETURNING id
    `);
    const groupB = await pool.query(`
      INSERT INTO fleet_groups (name) VALUES ('COVTEST-SCOPE-B') RETURNING id
    `);
    groupAId = groupA.rows[0].id;
    groupBId = groupB.rows[0].id;

    // Manager assigned to group A only - assigned_by is NOT NULL
    await pool.query(`
      INSERT INTO fleet_manager_assignments (fleet_manager_id, fleet_group_id, assigned_by)
      VALUES ($1, $2, $3)
    `, [manager.rows[0].id, groupAId, admin.rows[0].id]);

    // Vehicles
    await pool.query(`
      INSERT INTO vehicles (vehicle_id, fleet_group_id)
      VALUES ($1, $2), ($3, $4), ($5, NULL)
    `, [vehicleA, groupAId, vehicleB, groupBId, vehicleUnassigned]);

    adminToken = generateTestToken(admin.rows[0].id, 'covtest-scope-admin@example.com', 'admin');
    managerToken = generateTestToken(manager.rows[0].id, 'covtest-scope-manager@example.com', 'fleet_manager');
  });

  afterAll(async () => {
    await cleanup();
    await pool.end().catch(() => {});
  });

  describe('GET /api/vehicles', () => {
    test('fleet manager sees their own group vehicles and unassigned vehicles', async () => {
      // Use a large limit so all 115+ vehicles come back - default is 20
      const res = await request(app)
        .get('/api/vehicles?limit=200')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.vehicles.map((v) => v.id);
      expect(ids).toContain(vehicleA);
      expect(ids).not.toContain(vehicleB);
      // Unassigned vehicles are visible to everyone by policy
      expect(ids).toContain(vehicleUnassigned);
    });

    test('admin sees all vehicles regardless of group', async () => {
      const res = await request(app)
        .get('/api/vehicles?limit=200')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.vehicles.map((v) => v.id);
      expect(ids).toContain(vehicleA);
      expect(ids).toContain(vehicleB);
      expect(ids).toContain(vehicleUnassigned);
    });
  });

  describe('GET /api/vehicles/:vehicleId', () => {
    test('fleet manager gets 200 for their own group vehicle', async () => {
      const res = await request(app)
        .get(`/api/vehicles/${vehicleA}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
    });

    test('fleet manager gets 404 for another group vehicle', async () => {
      const res = await request(app)
        .get(`/api/vehicles/${vehicleB}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(404);
    });

    test('fleet manager can access unassigned vehicles by policy', async () => {
      const res = await request(app)
        .get(`/api/vehicles/${vehicleUnassigned}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
    });

    test('admin can access any vehicle regardless of group', async () => {
      const resA = await request(app)
        .get(`/api/vehicles/${vehicleA}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const resB = await request(app)
        .get(`/api/vehicles/${vehicleB}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const resU = await request(app)
        .get(`/api/vehicles/${vehicleUnassigned}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);
      expect(resU.status).toBe(200);
    });
  });

  describe('GET /api/vehicles/locations', () => {
    test('fleet manager sees their own group vehicle and unassigned in live locations', async () => {
      const res = await request(app)
        .get('/api/vehicles/locations')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.vehicles.map((v) => v.id);
      expect(ids).toContain(vehicleA);
      expect(ids).not.toContain(vehicleB);
      expect(ids).toContain(vehicleUnassigned);
    });

    test('admin sees all vehicles in live locations', async () => {
      const res = await request(app)
        .get('/api/vehicles/locations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.vehicles.map((v) => v.id);
      expect(ids).toContain(vehicleA);
      expect(ids).toContain(vehicleB);
      expect(ids).toContain(vehicleUnassigned);
    });
  });
});

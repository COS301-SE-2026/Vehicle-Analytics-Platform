/* eslint-env jest */
jest.unmock('pg');

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const generateTestToken = require('../tests/generateToken');

describe('Risk Endpoints (integration)', () => {
  let managerToken;
  let adminToken;

  beforeAll(() => {
    managerToken = generateTestToken(2, 'risk-int-manager@test.com', 'fleet_manager');
    adminToken = generateTestToken(1, 'risk-int-admin@test.com', 'admin');
  });

  afterAll(async () => {
    await pool.end().catch(() => {});
  });

  const auth = (token) => ({ Authorization: `Bearer ${token}` });


  

  describe('GET /api/risk/fleet', () => {
    test('returns 200 with vehicles ranked by risk score', async () => {
      const res = await request(app).get('/api/risk/fleet').set(auth(managerToken));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.vehicles)).toBe(true);

      if (res.body.data.vehicles.length > 0) {
        const v = res.body.data.vehicles[0];
        expect(v).toHaveProperty('vehicle_id');
        expect(v).toHaveProperty('risk_score');
        expect(v).toHaveProperty('risk_tier');
        expect(v).toHaveProperty('trend');
      }
    });

    test('vehicles are ranked descending by risk score', async () => {
      const res = await request(app).get('/api/risk/fleet').set(auth(managerToken));
      const scores = res.body.data.vehicles.map((v) => Number(v.risk_score));
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
      }
    });

    test('returns 401 without a token', async () => {
      const res = await request(app).get('/api/risk/fleet');
      expect(res.status).toBe(401);
    });
  });


  

  describe('GET /api/risk/vehicle/:vehicleId', () => {
    test('returns 200 with latest + trend for a vehicle that has predictions', async () => {
      const { rows } = await pool.query(`
        SELECT vehicle_id FROM vehicle_risk_predictions
        ORDER BY prediction_date DESC LIMIT 1
      `);
      if (!rows.length) {
        expect(true).toBe(true);
        return;
      }
      const vid = rows[0].vehicle_id;

      const res = await request(app)
        .get(`/api/risk/vehicle/${vid}`)
        .set(auth(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.vehicle_id).toBe(vid);
      expect(res.body.data.latest).toHaveProperty('risk_score');
      expect(res.body.data.latest).toHaveProperty('risk_tier');
      expect(res.body.data.latest).toHaveProperty('features');
      expect(Array.isArray(res.body.data.trend)).toBe(true);
    });

    test('returns 404 for a vehicle with no predictions', async () => {
      const res = await request(app)
        .get('/api/risk/vehicle/DOES-NOT-EXIST-XYZ')
        .set(auth(managerToken));
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('honours the days query parameter', async () => {
      const { rows } = await pool.query(`
        SELECT vehicle_id FROM vehicle_risk_predictions LIMIT 1
      `);
      if (!rows.length) return;
      const vid = rows[0].vehicle_id;

      const res = await request(app)
        .get(`/api/risk/vehicle/${vid}?days=5`)
        .set(auth(managerToken));
      expect(res.status).toBe(200);
      expect(res.body.data.trend.length).toBeLessThanOrEqual(6);
    });
  });


  

  describe('GET /api/risk/vehicle/:vehicleId/coaching', () => {
    test('returns 200 with interventions array', async () => {
      const res = await request(app)
        .get('/api/risk/vehicle/1000/coaching')
        .set(auth(managerToken));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('vehicle_id', '1000');
      expect(Array.isArray(res.body.data.interventions)).toBe(true);
    });
  });


  

  describe('GET /api/risk/vehicle/:vehicleId/similar', () => {
    test('returns 200 with up to 5 similar vehicles', async () => {
      const { rows } = await pool.query(`
        SELECT vehicle_id FROM vehicle_risk_features LIMIT 1
      `);
      if (!rows.length) return;
      const vid = rows[0].vehicle_id;

      const res = await request(app)
        .get(`/api/risk/vehicle/${vid}/similar`)
        .set(auth(managerToken));

      expect(res.status).toBe(200);
      expect(res.body.data.vehicle_id).toBe(vid);
      expect(Array.isArray(res.body.data.similar)).toBe(true);
      expect(res.body.data.similar.length).toBeLessThanOrEqual(5);

      const distances = res.body.data.similar.map((v) => Number(v.distance));
      for (let i = 1; i < distances.length; i++) {
        expect(distances[i - 1]).toBeLessThanOrEqual(distances[i]);
      }
    });

    test('honours the k query parameter', async () => {
      const { rows } = await pool.query(`
        SELECT vehicle_id FROM vehicle_risk_features LIMIT 1
      `);
      if (!rows.length) return;
      const vid = rows[0].vehicle_id;

      const res = await request(app)
        .get(`/api/risk/vehicle/${vid}/similar?k=3`)
        .set(auth(managerToken));
      expect(res.status).toBe(200);
      expect(res.body.data.similar.length).toBeLessThanOrEqual(3);
    });
  });


  

  describe('GET /api/risk/notifications', () => {
    test('returns 200 with notifications array and checked_at', async () => {
      const res = await request(app)
        .get('/api/risk/notifications')
        .set(auth(managerToken));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.notifications)).toBe(true);
      expect(res.body.data).toHaveProperty('checked_at');
    });
  });


  

  
  describe('POST /api/risk/run', () => {
    test('admin can trigger a manual prediction run', async () => {
      const res = await request(app)
        .post('/api/risk/run')
        .set(auth(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('scored');
      expect(res.body.data).toHaveProperty('alerts');
      expect(typeof res.body.data.scored).toBe('number');
      expect(res.body.data.scored).toBeGreaterThan(0);
    }, 90000);

    test('idempotent - running twice does not duplicate predictions', async () => {
      const before = await pool.query(`
        SELECT COUNT(*)::int AS c FROM vehicle_risk_predictions
        WHERE prediction_date = CURRENT_DATE
      `);

      await request(app).post('/api/risk/run').set(auth(adminToken));
      await request(app).post('/api/risk/run').set(auth(adminToken));

      const after = await pool.query(`
        SELECT COUNT(*)::int AS c FROM vehicle_risk_predictions
        WHERE prediction_date = CURRENT_DATE
      `);

      expect(after.rows[0].c).toBe(before.rows[0].c);
    }, 180000);

    test('viewer cannot trigger a prediction run', async () => {
      const viewerToken = generateTestToken(3, 'risk-int-viewer@test.com', 'viewer');
      const res = await request(app)
        .post('/api/risk/run')
        .set(auth(viewerToken));
      expect(res.status).toBe(403);
    });

    test('returns 401 without a token', async () => {
      const res = await request(app).post('/api/risk/run');
      expect(res.status).toBe(401);
    });
  });
});

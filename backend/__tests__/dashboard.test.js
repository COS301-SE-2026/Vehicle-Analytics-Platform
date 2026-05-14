const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { pool } = require('../src/db/pool');

describe('Dashboard API', () => {
  let token;

  beforeAll(() => {
    // Generate a valid token for testing
    token = jwt.sign(
      { id: '1', sub: 'test-user', email: 'test@example.com', role: 'admin' },
      process.env.JWT_SECRET || 'test_secret_key'
    );
  });

  afterAll(async () => {
     await pool.end();
  });

  describe('GET /api/dashboard/kpis', () => {
    it('should return fleet KPIs (200)', async () => {
      const res = await request(app)
        .get('/api/dashboard/kpis')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('total_vehicles');
      expect(res.body.data).toHaveProperty('active_vehicles');
      expect(res.body.data).toHaveProperty('alerts_today');
    });

    it('should decline missing token (401)', async () => {
      const res = await request(app).get('/api/dashboard/kpis');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/dashboard/alerts', () => {
    it('should return recent alerts (200)', async () => {
      const res = await request(app)
        .get('/api/dashboard/alerts?limit=10')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('alerts');
      expect(Array.isArray(res.body.data.alerts)).toBe(true);
    });
  });
});

/* NOSONAR */
const request = require('supertest');
const app = require('../src/app');
const { mockQuery } = require('pg');
const generateToken = require('../tests/generateToken');

process.env.JWT_SECRET = 'test_secret_key';
process.env.NODE_ENV = 'test';

describe('Dashboard API', () => {
  let adminToken;

  beforeAll(() => {
    adminToken = generateToken(1, 'admin@test.com', 'admin');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/dashboard/kpis - should return 401 without token', async () => {
    const res = await request(app).get('/api/dashboard/kpis');
    expect(res.status).toBe(401);
  });

  test('GET /api/dashboard/kpis - should return fleet KPIs (200)', async () => {
    mockQuery.mockResolvedValue({ rows: [{ total_vehicles: '10', active_vehicles: '7', alerts_today: '3' }] });
    const res = await request(app)
      .get('/api/dashboard/kpis')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total_vehicles).toBe(10);
  });

  test('GET /api/dashboard/alerts - should return 401 without token', async () => {
    const res = await request(app).get('/api/dashboard/alerts');
    expect(res.status).toBe(401);
  });

  test('GET /api/dashboard/alerts - should return recent alerts (200)', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ vehicle_id: 'VH-001', type: 'harsh_braking', event_category: null, latitude: -26.195, longitude: 28.034, speed: 45, timestamp: new Date() }]
    });
    const res = await request(app)
      .get('/api/dashboard/alerts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.alerts.length).toBe(1);
  });

  test('GET /api/dashboard/kpis - should handle database error (500)', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .get('/api/dashboard/kpis')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  test('GET /api/dashboard/alerts - should handle database error (500)', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .get('/api/dashboard/alerts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  test('GET /api/dashboard/alerts - should handle crash_detection event (critical severity)', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ vehicle_id: 'VH-001', type: null, event_category: 'crash_detection', latitude: -26.195, longitude: 28.034, speed: 0, timestamp: new Date() }]
    });
    const res = await request(app)
      .get('/api/dashboard/alerts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.alerts[0].severity).toBe('critical');
  });

  test('GET /api/dashboard/alerts - should handle harsh_cornering event (medium severity)', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ vehicle_id: 'VH-001', type: 'harsh_cornering', event_category: null, latitude: -26.195, longitude: 28.034, speed: 30, timestamp: new Date() }]
    });
    const res = await request(app)
      .get('/api/dashboard/alerts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.alerts[0].severity).toBe('medium');
  });
});

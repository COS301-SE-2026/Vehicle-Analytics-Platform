const request = require('supertest');
const app = require('../src/app');
const { mockQuery } = require('pg');
const generateToken = require('../tests/generateToken');

process.env.JWT_SECRET = 'test_secret_key';
process.env.NODE_ENV = 'test';

describe('Vehicle Controller', () => {
  let adminToken;

  beforeAll(() => {
    adminToken = generateToken(1, 'admin@test.com', 'admin');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/vehicles/locations - no token → 401', async () => {
    const res = await request(app).get('/api/vehicles/locations');
    expect(res.status).toBe(401);
  });

  test('GET /api/vehicles/locations - valid token, no vehicles → 200', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .get('/api/vehicles/locations')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.vehicles).toEqual([]);
  });

  test('GET /api/vehicles/locations - returns vehicles when data exists', async () => {
    const mockVehicles = [
      { id: 'VH-001', device_id: 'DEV-001', driver_name: 'John', status: 'active', latitude: -26.195, longitude: 28.034, speed: 60, last_update: new Date() },
    ];
    mockQuery.mockResolvedValue({ rows: mockVehicles });
    const res = await request(app)
      .get('/api/vehicles/locations')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.vehicles.length).toBe(1);
  });

  test('GET /api/vehicles/locations - database error → 500', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .get('/api/vehicles/locations')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  test('GET /api/vehicles/:id - no token → 401', async () => {
    const res = await request(app).get('/api/vehicles/VH-001');
    expect(res.status).toBe(401);
  });

  test('GET /api/vehicles/:id - vehicle not found → 404', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .get('/api/vehicles/XXX')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test('GET /api/vehicles/:id - found → 200', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'VH-001', device_id: 'DEV-001', driver_name: 'John' }] })
      .mockResolvedValueOnce({ rows: [{ type: 'harsh_braking', speed: 45, timestamp: new Date() }] });
    const res = await request(app)
      .get('/api/vehicles/VH-001')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.vehicle).toBeDefined();
  });

  test('GET /api/vehicles/:id - database error → 500', async () => {
    mockQuery.mockRejectedValue(new Error('DB error on fetch'));
    const res = await request(app)
      .get('/api/vehicles/VH-001')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

test('GET /api/vehicles/:id - database error → 500 (covers line 38)', async () => {
  mockQuery.mockRejectedValue(new Error('DB error'));
  const res = await request(app)
    .get('/api/vehicles/VH-001')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(500);
});
});

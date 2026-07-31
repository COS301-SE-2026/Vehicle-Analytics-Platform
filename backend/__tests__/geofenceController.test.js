require('./setup/authMock');

const { mockPool, mockQuery, setupMockData } = require('./setup/mockDb');

jest.mock('../src/db/pool', () => ({ pool: mockPool }));

const request = require('supertest');
const app = require('../src/app');

describe('Geofence Controller - Full Coverage', () => {
  beforeEach(() => {
    setupMockData();
  });

  describe('POST /api/geofences', () => {
    test('should create a new geofence', async () => {
      const response = await request(app)
        .post('/api/geofences')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Test Zone',
          boundary: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
          trigger_type: 'both',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.geofence).toHaveProperty('id');
      expect(response.body.data.geofence.name).toBe('Test Zone');
    });

    test('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/geofences')
        .set('Authorization', 'Bearer test-token')
        .send({
          boundary: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 if boundary is missing', async () => {
      const response = await request(app)
        .post('/api/geofences')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Test Zone',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/geofences', () => {
    test('should return all geofences', async () => {
      const response = await request(app)
        .get('/api/geofences')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.geofences).toBeDefined();
      expect(Array.isArray(response.body.data.geofences)).toBe(true);
    });

    test('should filter active geofences', async () => {
      const response = await request(app)
        .get('/api/geofences?active_only=true')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/geofences/:id', () => {
    test('should delete a geofence', async () => {
      const response = await request(app)
        .delete('/api/geofences/1')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Geofence deleted successfully');
    });

    test('should return 404 for non-existent geofence', async () => {
      // Mock an empty DB result set for this query without reassigning mockPool.query
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .delete('/api/geofences/99999')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/geofences/events', () => {
    test('should return geofence events', async () => {
      const response = await request(app)
        .get('/api/geofences/events')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toBeDefined();
      expect(Array.isArray(response.body.data.events)).toBe(true);
    });

    test('should filter by geofence_id', async () => {
      const response = await request(app)
        .get('/api/geofences/events?geofence_id=1')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should filter by vehicle_id', async () => {
      const response = await request(app)
        .get('/api/geofences/events?vehicle_id=V001')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/geofences/events?limit=10')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/geofences/discover/stops', () => {
    test('should discover frequent stops', async () => {
      const response = await request(app)
        .get('/api/geofences/discover/stops?vehicle_id=V001&days=7')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.clusters).toBeDefined();
      expect(Array.isArray(response.body.data.clusters)).toBe(true);
    });

    test('should filter by vehicle_id and days', async () => {
      const response = await request(app)
        .get('/api/geofences/discover/stops?vehicle_id=V001&days=7')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should filter by event_category', async () => {
      const response = await request(app)
        .get('/api/geofences/discover/stops?vehicle_id=V001&days=7&event_category=crash_detection')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should filter by event_detail', async () => {
      const response = await request(app)
        .get('/api/geofences/discover/stops?vehicle_id=V001&days=7&event_detail=real_crash_detected')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/geofences/discover/stops?vehicle_id=V001&days=7&limit=5')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/geofences/discover/create', () => {
    test('should create geofence from cluster', async () => {
      const response = await request(app)
        .post('/api/geofences/discover/create')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Cluster Zone',
          center_lat: -25.0,
          center_lng: 28.0,
          radius_km: 0.5,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.geofence).toHaveProperty('id');
    });

    test('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/geofences/discover/create')
        .set('Authorization', 'Bearer test-token')
        .send({
          center_lat: -25.0,
          center_lng: 28.0,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 if center_lat is missing', async () => {
      const response = await request(app)
        .post('/api/geofences/discover/create')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Cluster Zone',
          center_lng: 28.0,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 if center_lng is missing', async () => {
      const response = await request(app)
        .post('/api/geofences/discover/create')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Cluster Zone',
          center_lat: -25.0,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
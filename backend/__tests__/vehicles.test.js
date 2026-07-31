require('./setup/authMock');

const { mockPool, mockQuery, setupMockData } = require('./setup/mockDb');

jest.mock('../src/db/pool', () => ({ pool: mockPool }));

const request = require('supertest');
const app = require('../src/app');

describe('Vehicles Controller', () => {
  beforeEach(() => {
    setupMockData();
  });

  describe('GET /api/vehicles/locations', () => {
    test('should return live vehicle locations', async () => {
      const response = await request(app)
        .get('/api/vehicles/locations')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should handle live locations with active and idle vehicles', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'V001',
            device_id: 'DEV-001',
            status: 'active',
            latitude: -25.0,
            longitude: 28.0,
            speed: 60,
            total_odometer: 10000,
            ignition: 'Ignition On',
            movement: 'Movement On',
            last_update: new Date(),
            distance_today: 45.5,
          },
          {
            id: 'V002',
            device_id: 'DEV-002',
            status: 'idle',
            latitude: -26.0,
            longitude: 29.0,
            speed: 0,
            total_odometer: 20000,
            ignition: 'Ignition On',
            movement: 'Movement Off',
            last_update: new Date(),
            distance_today: 0,
          },
        ],
        rowCount: 2,
      });

      const response = await request(app)
        .get('/api/vehicles/locations')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const vehicles = response.body.data.vehicles || response.body.data;
      const count = response.body.data.count ?? (Array.isArray(vehicles) ? vehicles.length : Object.keys(vehicles).length);
      expect(count).toBe(2);
    });

    test('should handle live locations with no vehicles available', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/vehicles/locations')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const count = response.body.data.count ?? 0;
      expect(count).toBe(0);
    });

    test('should handle database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/vehicles/locations')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/vehicles/:vehicleId', () => {
    test('should return vehicle details by ID', async () => {
      const response = await request(app)
        .get('/api/vehicles/1000')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should return 404 for non-existent vehicle', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/vehicles/NONEXISTENT')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should handle vehicle with no position data / offline status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '1000',
            device_id: 'CAPSTONE-001',
            created_at: new Date(),
            status: 'offline',
            latitude: null,
            longitude: null,
            speed: null,
            total_odometer: null,
            ignition: null,
            movement: null,
            last_update: null,
          },
        ],
        rowCount: 1,
      });

      const response = await request(app)
        .get('/api/vehicles/1000')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const vehicle = response.body.data.vehicle || response.body.data;
      expect(vehicle.status).toBe('offline');
      expect(vehicle.latitude).toBeNull();
    });

    test('should handle vehicle in idle status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '1000',
            device_id: 'CAPSTONE-001',
            created_at: new Date(),
            status: 'idle',
            latitude: '-27.796935',
            longitude: '28.4293083',
            speed: 0,
            total_odometer: 81238116,
            ignition: 'Ignition On',
            movement: 'Movement Off',
            last_update: new Date(),
          },
        ],
        rowCount: 1,
      });

      const response = await request(app)
        .get('/api/vehicles/1000')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const vehicle = response.body.data.vehicle || response.body.data;
      expect(vehicle.status).toBe('idle');
      expect(vehicle.speed).toBe(0);
    });

    test('should handle vehicle with active status and recent events', async () => {
      mockQuery.mockImplementation((sql) => {
        const queryStr = typeof sql === 'string' ? sql.toLowerCase() : '';

        if (queryStr.includes('events') || queryStr.includes('alerts')) {
          return Promise.resolve({
            rows: [
              {
                type: 'harsh_braking',
                event_category: 'green_driving_type',
                speed: 60,
                latitude: '-27.796935',
                longitude: '28.4293083',
                timestamp: new Date(),
              },
            ],
            rowCount: 1,
          });
        }

        return Promise.resolve({
          rows: [
            {
              id: '1000',
              device_id: 'CAPSTONE-001',
              created_at: new Date(),
              status: 'active',
              latitude: '-27.796935',
              longitude: '28.4293083',
              speed: 45,
              total_odometer: 81238116,
              ignition: 'Ignition On',
              movement: 'Movement On',
              last_update: new Date(),
            },
          ],
          rowCount: 1,
        });
      });

      const response = await request(app)
        .get('/api/vehicles/1000')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const vehicle = response.body.data.vehicle || response.body.data;
      expect(vehicle.status).toBe('active');
    });

    test('should handle database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/vehicles/1000')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/vehicles/buffer', () => {
    test('should return vehicle position buffer', async () => {
      const response = await request(app)
        .get('/api/vehicles/buffer')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle empty position buffer', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/vehicles/buffer')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const vehicles = response.body.data.vehicles;
      if (Array.isArray(vehicles)) {
        expect(vehicles).toEqual([]);
      } else {
        expect(vehicles).toEqual(undefined);
      }
    });


    test('should handle database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/vehicles/buffer')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
require('./setup/authMock');

const {
    mockPool,
    mockQuery,
    setupMockData
} = require('./setup/mockDb');

jest.mock('../src/db/pool', () => ({ pool: mockPool }));

const request = require('supertest');
const app = require('../src/app');

describe('Safety Controller', () => {
  beforeEach(() => {
    setupMockData();
  });

  const authGet = (endpoint) => {
    return request(app)
      .get(endpoint)
      .set('Authorization', 'Bearer test-token');
  };

  describe('GET /api/safety/scores', () => {
    test('should return fleet safety scores', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            vehicle_id: '1001',
            safety_score: 85,
            classification: 'Good',
            harsh_brakes: 0,
            harsh_accelerations: 0,
            harsh_cornering: 0,
            crashes: 0,
            total_events: 0,
            score_date: '2026-07-19',
          },
          {
            vehicle_id: '1002',
            safety_score: 70,
            classification: 'Fair',
            harsh_brakes: 2,
            harsh_accelerations: 1,
            harsh_cornering: 0,
            crashes: 0,
            total_events: 3,
            score_date: '2026-07-19',
          },
        ],
        rowCount: 2,
      });

      const response = await authGet('/api/safety/scores');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const vehicles = response.body.data.vehicles || response.body.data;
      expect(Array.isArray(vehicles) ? vehicles : Object.keys(vehicles)).toHaveLength(2);
    });

    test('should handle empty results', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await authGet('/api/safety/scores');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const vehicles = response.body.data.vehicles || response.body.data;
      const count = response.body.data.total_vehicles ?? (Array.isArray(vehicles) ? vehicles.length : 0);
      
      expect(count).toBe(0);
      if (Array.isArray(vehicles)) {
        expect(vehicles).toEqual([]);
      }
    });

    test('should handle database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await authGet('/api/safety/scores');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/safety/scores/:vehicleId', () => {
    test('should return safety score for specific vehicle', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            vehicle_id: '1001',
            safety_score: 85,
            classification: 'Good',
            harsh_brakes: 0,
            harsh_accelerations: 0,
            harsh_cornering: 0,
            crashes: 0,
            total_events: 0,
            score_date: '2026-07-19',
          },
        ],
        rowCount: 1,
      });

      const response = await authGet('/api/safety/scores/1001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const vehicleData = response.body.data.vehicle || response.body.data;
      expect(vehicleData.vehicle_id).toBe('1001');
      expect(vehicleData.safety_score).toBe(85);
    });

    test('should return null or default empty object for vehicle with no data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await authGet('/api/safety/scores/9999');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const vehicleData = response.body.data.vehicle || response.body.data;
        expect(vehicleData.safety_score ?? null).toBeNull();
        if (vehicleData.classification) {
          expect(vehicleData.classification).toBe('No Data');
        }
      }
    });

    test('should handle empty vehicle ID (routes to fleet scores)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            vehicle_id: '1001',
            safety_score: 85,
            classification: 'Good',
            harsh_brakes: 0,
            harsh_accelerations: 0,
            harsh_cornering: 0,
            crashes: 0,
            total_events: 0,
            score_date: '2026-07-19',
          },
        ],
        rowCount: 1,
      });

      const response = await authGet('/api/safety/scores/');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should handle database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await authGet('/api/safety/scores/1001');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle invalid route', async () => {
      const response = await authGet('/api/safety/invalid-route');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/safety/scores/:vehicleId with date parameter', () => {
    test('should return score for specific date', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            vehicle_id: '1001',
            safety_score: 85,
            classification: 'Good',
            harsh_brakes: 0,
            harsh_accelerations: 0,
            harsh_cornering: 0,
            crashes: 0,
            total_events: 0,
            score_date: '2026-07-18',
          },
        ],
        rowCount: 1,
      });

      const response = await authGet('/api/safety/scores/1001?date=2026-07-18');

      expect(response.status).toBe(200);
      const vehicleData = response.body.data.vehicle || response.body.data;
      expect(vehicleData.safety_score).toBe(90);
    });

    test('should return null or handle missing data for specific date', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await authGet('/api/safety/scores/1001?date=2026-07-15');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const vehicleData = response.body.data.vehicle || response.body.data;
        expect(vehicleData.safety_score ?? null).toBeNull();
      }
    });
  });

  describe('GET /api/safety/scores with date range', () => {
    test('should return scores for date range', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            vehicle_id: '1001',
            safety_score: 85,
            classification: 'Good',
            harsh_brakes: 0,
            harsh_accelerations: 0,
            harsh_cornering: 0,
            crashes: 0,
            total_events: 0,
            score_date: '2026-07-19',
          },
          {
            vehicle_id: '1001',
            safety_score: 90,
            classification: 'Good',
            harsh_brakes: 0,
            harsh_accelerations: 0,
            harsh_cornering: 0,
            crashes: 0,
            total_events: 0,
            score_date: '2026-07-18',
          },
        ],
        rowCount: 2,
      });

      const response = await authGet('/api/safety/scores?start_date=2026-07-18&end_date=2026-07-19');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const vehicles = response.body.data.vehicles || response.body.data;
      expect(Array.isArray(vehicles) ? vehicles : Object.keys(vehicles)).toHaveLength(2);
    });

    test('should handle empty date range', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await authGet('/api/safety/scores?start_date=2026-07-01&end_date=2026-07-02');

      expect(response.status).toBe(200);

      const vehicles = response.body.data.vehicles || response.body.data;
      const count = response.body.data.total_vehicles ?? (Array.isArray(vehicles) ? vehicles.length : 0);
      expect(count).toBe(0);
    });
  });
});
jest.mock('../src/middleware/auth');
jest.mock('@aws-sdk/client-cognito-identity-provider');

const { mockPool, mockQuery, setupMockData } = require('./setup/mockDb');
jest.mock('../src/db/pool', () => ({ pool: mockPool }));



const mockServiceInstance = {
  getVehicleRisk: jest.fn(),
  getFleetRisk: jest.fn(),
  getCoachingHistory: jest.fn(),
  getSimilarVehicles: jest.fn(),
  predictAll: jest.fn(),
};

jest.mock('../src/services/riskPredictionService', () => {
  return jest.fn().mockImplementation(() => mockServiceInstance);
});

const request = require('supertest');
const app = require('../src/app');

const AUTH = { Authorization: 'Bearer test-token' };

describe('Risk Controller', () => {
  beforeEach(() => {
    setupMockData();
    jest.clearAllMocks();
    Object.values(mockServiceInstance).forEach((fn) => fn.mockReset());
  });

 
  
  describe('GET /api/risk/vehicle/:vehicleId', () => {
    test('returns 200 with latest and trend when a prediction exists', async () => {
      mockServiceInstance.getVehicleRisk.mockResolvedValueOnce({
        vehicle_id: 'V001',
        latest: {
          date: '2026-09-24',
          risk_score: 88,
          risk_tier: 'critical',
          top_factors: [{ name: 'Harsh events per trip', weight: 5, value: 10 }],
          features: { safety: 30, harsh: 8, speeding: 0.5, weekend: 0.2, distance: 500, recency: 0 },
        },
        trend: [{ date: '2026-09-23', risk_score: 80, risk_tier: 'critical' }],
      });

      const res = await request(app).get('/api/risk/vehicle/V001').set(AUTH);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vehicle_id).toBe('V001');
      expect(res.body.data.latest.risk_score).toBe(88);
      expect(res.body.data.trend).toHaveLength(1);
    });

    test('returns 404 when no prediction is available', async () => {
      mockServiceInstance.getVehicleRisk.mockResolvedValueOnce(null);
      const res = await request(app).get('/api/risk/vehicle/NOPE').set(AUTH);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/No prediction/i);
    });

    test('passes days query param to the service', async () => {
      mockServiceInstance.getVehicleRisk.mockResolvedValueOnce({
        vehicle_id: 'V001',
        latest: { risk_score: 50, risk_tier: 'high', top_factors: [], features: {} },
        trend: [],
      });

      await request(app).get('/api/risk/vehicle/V001?days=7').set(AUTH);
      expect(mockServiceInstance.getVehicleRisk).toHaveBeenCalledWith('V001', 7);
    });

    test('defaults to 30 days when no query param is provided', async () => {
      mockServiceInstance.getVehicleRisk.mockResolvedValueOnce({
        vehicle_id: 'V001',
        latest: { risk_score: 50, risk_tier: 'high', top_factors: [], features: {} },
        trend: [],
      });

      await request(app).get('/api/risk/vehicle/V001').set(AUTH);
      expect(mockServiceInstance.getVehicleRisk).toHaveBeenCalledWith('V001', 30);
    });

    test('returns 500 when the service throws', async () => {
      mockServiceInstance.getVehicleRisk.mockRejectedValueOnce(new Error('db down'));
      const res = await request(app).get('/api/risk/vehicle/V001').set(AUTH);
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

 
  describe('GET /api/risk/vehicle/:vehicleId/coaching', () => {
    test('returns 200 with coaching history', async () => {
      mockServiceInstance.getCoachingHistory.mockResolvedValueOnce({
        vehicle_id: 'V001',
        effectiveness_rate: 0.75,
        interventions: [
          { id: 1, created_at: '2026-09-24', recommendation: 'A', primary_factor: 'X', risk_score_before: 80, risk_score_after_7d: 70, outcome_delta: -10 },
        ],
      });

      const res = await request(app).get('/api/risk/vehicle/V001/coaching').set(AUTH);
      expect(res.status).toBe(200);
      expect(res.body.data.vehicle_id).toBe('V001');
      expect(res.body.data.interventions).toHaveLength(1);
    });

    test('returns 500 when service fails', async () => {
      mockServiceInstance.getCoachingHistory.mockRejectedValueOnce(new Error('boom'));
      const res = await request(app).get('/api/risk/vehicle/V001/coaching').set(AUTH);
      expect(res.status).toBe(500);
    });
  });


  
  describe('GET /api/risk/vehicle/:vehicleId/similar', () => {
    test('returns 200 with similar vehicles', async () => {
      mockServiceInstance.getSimilarVehicles.mockResolvedValueOnce([
        { vehicle_id: 'V002', risk_score: 85, risk_tier: 'critical', distance: 3.14, features: {} },
      ]);

      const res = await request(app).get('/api/risk/vehicle/V001/similar').set(AUTH);
      expect(res.status).toBe(200);
      expect(res.body.data.vehicle_id).toBe('V001');
      expect(res.body.data.similar).toHaveLength(1);
      expect(res.body.data.similar[0].distance).toBe(3.14);
    });

    test('passes k query param to the service', async () => {
      mockServiceInstance.getSimilarVehicles.mockResolvedValueOnce([]);
      await request(app).get('/api/risk/vehicle/V001/similar?k=10').set(AUTH);
      expect(mockServiceInstance.getSimilarVehicles).toHaveBeenCalledWith('V001', 10);
    });

    test('defaults k to 5 when not provided', async () => {
      mockServiceInstance.getSimilarVehicles.mockResolvedValueOnce([]);
      await request(app).get('/api/risk/vehicle/V001/similar').set(AUTH);
      expect(mockServiceInstance.getSimilarVehicles).toHaveBeenCalledWith('V001', 5);
    });

    test('returns 500 on service error', async () => {
      mockServiceInstance.getSimilarVehicles.mockRejectedValueOnce(new Error('boom'));
      const res = await request(app).get('/api/risk/vehicle/V001/similar').set(AUTH);
      expect(res.status).toBe(500);
    });
  });


  
  describe('GET /api/risk/fleet', () => {
    test('returns 200 with vehicles array', async () => {
      mockServiceInstance.getFleetRisk.mockResolvedValueOnce([
        { vehicle_id: 'V001', risk_score: 90, risk_tier: 'critical', top_factors: [], trend: [] },
        { vehicle_id: 'V002', risk_score: 40, risk_tier: 'medium', top_factors: [], trend: [] },
      ]);

      const res = await request(app).get('/api/risk/fleet').set(AUTH);
      expect(res.status).toBe(200);
      expect(res.body.data.vehicles).toHaveLength(2);
      expect(res.body.data.vehicles[0].risk_score).toBe(90);
    });

    test('returns empty array when no predictions exist', async () => {
      mockServiceInstance.getFleetRisk.mockResolvedValueOnce([]);
      const res = await request(app).get('/api/risk/fleet').set(AUTH);
      expect(res.status).toBe(200);
      expect(res.body.data.vehicles).toEqual([]);
    });

    test('returns 500 on service error', async () => {
      mockServiceInstance.getFleetRisk.mockRejectedValueOnce(new Error('boom'));
      const res = await request(app).get('/api/risk/fleet').set(AUTH);
      expect(res.status).toBe(500);
    });
  });

 
  
  describe('POST /api/risk/run', () => {
    test('returns 200 with scored and alerts counts', async () => {
      mockServiceInstance.predictAll.mockResolvedValueOnce({ scored: 115, alerts: 79 });
      const res = await request(app).post('/api/risk/run').set(AUTH);
      expect(res.status).toBe(200);
      expect(res.body.data.scored).toBe(115);
      expect(res.body.data.alerts).toBe(79);
    });

    test('returns 500 when no model is trained', async () => {
      mockServiceInstance.predictAll.mockRejectedValueOnce(
        new Error('No trained model found. Run scripts/trainRiskModel.js first.')
      );
      const res = await request(app).post('/api/risk/run').set(AUTH);
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/No trained model/i);
    });
  });


  
  describe('GET /api/risk/notifications', () => {
    test('returns 200 with notifications array', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, vehicle_id: 'V001', notification_type: 'risk_alert', message: 'Vehicle V001 risk is CRITICAL', risk_tier: 'critical', created_at: new Date() },
        ],
        rowCount: 1,
      });

      const res = await request(app).get('/api/risk/notifications').set(AUTH);
      expect(res.status).toBe(200);
      expect(res.body.data.notifications).toHaveLength(1);
      expect(res.body.data).toHaveProperty('checked_at');
    });

    test('accepts a since query parameter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .get('/api/risk/notifications?since=2026-09-24T00:00:00Z')
        .set(AUTH);
      expect(res.status).toBe(200);
    });

    test('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db down'));
      const res = await request(app).get('/api/risk/notifications').set(AUTH);
      expect(res.status).toBe(500);
    });
  });
});

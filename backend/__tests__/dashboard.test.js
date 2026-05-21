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

  // Helper function for authenticated requests
  const authGet = (endpoint) => {
    return request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${adminToken}`);
  };

  // Helper to test 401 unauthorized
  const testUnauthorized = (endpoint) => {
    it('should return 401 without token', async () => {
      const response = await request(app).get(endpoint);
      expect(response.status).toBe(401);
    });
  };

  // Helper to test database error handling
  const testDatabaseError = (endpoint, errorMessage) => {
    it('should handle database error', async () => {
      mockQuery.mockRejectedValue(new Error(errorMessage));
      const response = await authGet(endpoint);
      expect(response.status).toBe(500);
    });
  };

  describe('GET /api/dashboard/kpis', () => {
    testUnauthorized('/api/dashboard/kpis');

    it('should return fleet KPIs with valid token', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total_vehicles: '10', active_vehicles: '7', alerts_today: '3' }] });
      const response = await authGet('/api/dashboard/kpis');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total_vehicles).toBe(10);
    });

    it('should handle null values in KPIs response', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total_vehicles: null, active_vehicles: null, alerts_today: null }] });
      const response = await authGet('/api/dashboard/kpis');
      expect(response.status).toBe(200);
      expect(response.body.data.total_vehicles).toBe(0);
    });

    testDatabaseError('/api/dashboard/kpis', 'Database connection failed');
  });

  describe('GET /api/dashboard/alerts', () => {
    testUnauthorized('/api/dashboard/alerts');

    it('should return recent alerts with valid token', async () => {
      const mockAlert = { 
        vehicle_id: 'VH-001', 
        type: 'harsh_braking', 
        event_category: null, 
        latitude: -26.195, 
        longitude: 28.034, 
        speed: 45, 
        timestamp: new Date() 
      };
      mockQuery.mockResolvedValue({ rows: [mockAlert] });
      const response = await authGet('/api/dashboard/alerts');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts.length).toBe(1);
    });

    it('should handle empty alerts array', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const response = await authGet('/api/dashboard/alerts');
      expect(response.status).toBe(200);
      expect(response.body.data.alerts.length).toBe(0);
    });

    testDatabaseError('/api/dashboard/alerts', 'Database connection failed');

    const severityTestCases = [
      { type: 'crash_detection', category: 'crash_detection', expected: 'critical', speed: 0 },
      { type: 'harsh_braking', category: null, expected: 'high', speed: 45 },
      { type: 'harsh_acceleration', category: null, expected: 'medium', speed: 50 },
      { type: 'harsh_cornering', category: null, expected: 'medium', speed: 30 },
    ];

    severityTestCases.forEach(({ type, category, expected, speed }) => {
      it(`should set severity to ${expected} for ${type}`, async () => {
        mockQuery.mockResolvedValue({
          rows: [{ 
            vehicle_id: 'VH-001', 
            type: type === 'crash_detection' ? null : type, 
            event_category: category, 
            latitude: -26.195, 
            longitude: 28.034, 
            speed: speed, 
            timestamp: new Date() 
          }]
        });
        const response = await authGet('/api/dashboard/alerts');
        expect(response.status).toBe(200);
        expect(response.body.data.alerts[0].severity).toBe(expected);
      });
    });
  });

  describe('GET /api/dashboard/total-distance', () => {
    testUnauthorized('/api/dashboard/total-distance');

    it('should return total distance with valid token', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total_distance: '142.5' }] });
      const response = await authGet('/api/dashboard/total-distance');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total_distance).toBe(142.5);
      expect(response.body.data.unit).toBe('km');
    });

    it('should return zero when no distance data', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total_distance: '0' }] });
      const response = await authGet('/api/dashboard/total-distance');
      expect(response.status).toBe(200);
      expect(response.body.data.total_distance).toBe(0);
    });

    it('should handle null result gracefully', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total_distance: null }] });
      const response = await authGet('/api/dashboard/total-distance');
      expect(response.status).toBe(200);
      expect(response.body.data.total_distance).toBe(0);
    });

    testDatabaseError('/api/dashboard/total-distance', 'Database connection failed');
  });
});

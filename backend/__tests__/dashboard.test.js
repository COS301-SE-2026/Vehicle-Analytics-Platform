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

  describe('GET /api/dashboard/kpis', () => {
    test('should return 401 without token', async () => {
      const response = await request(app).get('/api/dashboard/kpis');
      expect(response.status).toBe(401);
    });

    test('should return fleet KPIs with valid token', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total_vehicles: '10', active_vehicles: '7', alerts_today: '3' }] });
      const response = await request(app)
        .get('/api/dashboard/kpis')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total_vehicles).toBe(10);
    });

    test('should handle null values in KPIs response', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total_vehicles: null, active_vehicles: null, alerts_today: null }] });
      const response = await request(app)
        .get('/api/dashboard/kpis')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data.total_vehicles).toBe(0);
    });

    test('should handle database error', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));
      const response = await request(app)
        .get('/api/dashboard/kpis')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/dashboard/alerts', () => {
    test('should return 401 without token', async () => {
      const response = await request(app).get('/api/dashboard/alerts');
      expect(response.status).toBe(401);
    });

    test('should return recent alerts with valid token', async () => {
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
      const response = await request(app)
        .get('/api/dashboard/alerts')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts.length).toBe(1);
    });

    test('should handle empty alerts array', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const response = await request(app)
        .get('/api/dashboard/alerts')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data.alerts.length).toBe(0);
    });

    test('should handle database error', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));
      const response = await request(app)
        .get('/api/dashboard/alerts')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(500);
    });

    test('should set severity to critical for crash detection', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ 
          vehicle_id: 'VH-001', 
          type: null, 
          event_category: 'crash_detection', 
          latitude: -26.195, 
          longitude: 28.034, 
          speed: 0, 
          timestamp: new Date() 
        }]
      });
      const response = await request(app)
        .get('/api/dashboard/alerts')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data.alerts[0].severity).toBe('critical');
    });

    test('should set severity to high for harsh braking', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ 
          vehicle_id: 'VH-001', 
          type: 'harsh_braking', 
          event_category: null, 
          latitude: -26.195, 
          longitude: 28.034, 
          speed: 45, 
          timestamp: new Date() 
        }]
      });
      const response = await request(app)
        .get('/api/dashboard/alerts')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data.alerts[0].severity).toBe('high');
    });

    test('should set severity to medium for harsh acceleration', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ 
          vehicle_id: 'VH-001', 
          type: 'harsh_acceleration', 
          event_category: null, 
          latitude: -26.195, 
          longitude: 28.034, 
          speed: 50, 
          timestamp: new Date() 
        }]
      });
      const response = await request(app)
        .get('/api/dashboard/alerts')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data.alerts[0].severity).toBe('medium');
    });

    test('should set severity to medium for harsh cornering', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ 
          vehicle_id: 'VH-001', 
          type: 'harsh_cornering', 
          event_category: null, 
          latitude: -26.195, 
          longitude: 28.034, 
          speed: 30, 
          timestamp: new Date() 
        }]
      });
      const response = await request(app)
        .get('/api/dashboard/alerts')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data.alerts[0].severity).toBe('medium');
    });
  });

  describe('GET /api/dashboard/total-distance', () => {
    test('should return 401 without token', async () => {
      const response = await request(app).get('/api/dashboard/total-distance');
      expect(response.status).toBe(401);
    });

    test('should return total distance with valid token', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total_distance: '142.5' }] });
      const response = await request(app)
        .get('/api/dashboard/total-distance')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total_distance).toBe(142.5);
      expect(response.body.data.unit).toBe('km');
    });

    test('should return zero when no distance data', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total_distance: '0' }] });
      const response = await request(app)
        .get('/api/dashboard/total-distance')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data.total_distance).toBe(0);
    });

    test('should handle null result gracefully', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total_distance: null }] });
      const response = await request(app)
        .get('/api/dashboard/total-distance')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data.total_distance).toBe(0);
    });

    test('should handle database error', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));
      const response = await request(app)
        .get('/api/dashboard/total-distance')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(500);
    });
  });
});

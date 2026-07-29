jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = {id: 1, role: 'fleet_manager', sub: 'test-sub'};
    next();
  },
  requireRole: (roles) => (req, res, next) => {
    if(!req.user){
      return res.status(401).json({error: 'Unauthorized'});
    }
    if(!roles.includes(req.user.role)){
      return res.status(403).json({error: 'Insufficient permissions'});
    }
    next();
  }
}));
 
jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      AuthenticationResult: {
        AccessToken: 'mock-access-token',
        IdToken: 'mock-id-token',
        RefreshToken: 'mock-refresh-token',
        ExpiresIn: 3600
      },
      UserSub: 'mock-user-sub'
    })
  })),
  SignUpCommand: jest.fn(),
  InitiateAuthCommand: jest.fn(),
  GlobalSignOutCommand: jest.fn(),
  AdminDisableUserCommand: jest.fn(),
  AdminUpdateUserAttributesCommand: jest.fn()
})
);
 
const {mockPool, setupMockData} = require('./setup/mockDb');
jest.mock('../src/db/pool', () => ({ pool: mockPool }));
 
const request = require('supertest');
const app = require('../src/app');
 
describe('Fleet Analytics Controller', () => {
  beforeAll(() => {
    setupMockData();
  });
 
  describe('GET /api/fleet/analytics', () => {
    test('should return fleet analytics for day period', async () => {
      const response = await request(app)
      .get('/api/fleet/analytics?period=day')
      .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('day');
      expect(response.body.data.trend).toBeDefined();
      expect(response.body.data.ranked_vehicles).toBeDefined();
      expect(response.body.data.event_breakdown).toBeDefined();
      expect(response.body.data.vehicle_contributions).toBeDefined();
 
      const { trend, ranked_vehicles, event_breakdown, vehicle_contributions } = response.body.data;
 
      expect(trend[0]).toMatchObject({ date: expect.anything(), avg_score: expect.any(Number) });
 
      expect(ranked_vehicles[0].vehicle_id).toBe('V001');
      expect(ranked_vehicles[0]).toMatchObject({
        vehicle_id: expect.any(String),
        avg_score: expect.any(Number),
        harsh_brakes: expect.any(Number),
      });
 
      expect(event_breakdown[0]).toMatchObject({ type: expect.any(String), count: expect.any(Number) });
 
      expect(vehicle_contributions[0].vehicle_id).toBe('V001');
      expect(vehicle_contributions[0]).toMatchObject({
        vehicle_id: expect.any(String),
        total_events: expect.any(Number),
      });
    });
 
    test('ranked_vehicles should be sorted ascending by avg_score (worst first)', async () => {
      const response = await request(app)
      .get('/api/fleet/analytics?period=day')
      .set('Authorization', 'Bearer test-token');
 
      const scores = response.body.data.ranked_vehicles.map(v => v.avg_score);
      const sorted = [...scores].sort((a, b) => a - b);
      expect(scores).toEqual(sorted);
    });
 
    test('should return empty arrays (not an error) when no data exists for the period', async () => {
      mockPool.query.mockImplementation(() => Promise.resolve({ rows: [], rowCount: 0 }));
 
      const response = await request(app)
      .get('/api/fleet/analytics?period=day')
      .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.trend).toEqual([]);
      expect(response.body.data.ranked_vehicles).toEqual([]);
      expect(response.body.data.event_breakdown).toEqual([]);
      expect(response.body.data.vehicle_contributions).toEqual([]);
 
      setupMockData(); // restore the shared fixture implementation for later tests
    });
 
    test('should coerce string-typed numeric fields from the DB into real numbers', async () => {
      mockPool.query.mockImplementation((sql) => {
        if (sql.includes('driver_daily_safety_scores') && sql.includes('GROUP BY score_date')) {
          return Promise.resolve({ rows: [{ score_date: '2026-07-20', avg_score: '85.5', vehicle_count: '10' }], rowCount: 1 });
        }
        if (sql.includes('driver_daily_safety_scores') && sql.includes('GROUP BY vehicle_id')) {
          return Promise.resolve({ rows: [{ vehicle_id: 'V001', avg_score: '75.0', harsh_brakes: '2', harsh_accelerations: '1', harsh_cornering: '0', crashes: '0', days_count: '5' }], rowCount: 1 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });
 
      const response = await request(app)
      .get('/api/fleet/analytics?period=day')
      .set('Authorization', 'Bearer test-token');
 
      expect(typeof response.body.data.trend[0].avg_score).toBe('number');
      expect(typeof response.body.data.ranked_vehicles[0].avg_score).toBe('number');
      expect(typeof response.body.data.ranked_vehicles[0].harsh_brakes).toBe('number');
 
      setupMockData(); // restore the shared fixture implementation for later tests
    });
 
    test('should return fleet analytics for week period', async () => {
      const response = await request(app)
      .get('/api/fleet/analytics?period=week')
      .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('week');
      expect(response.body.data.trend).toBeDefined();
    });
 
    test('should handle invalid period', async () => {
      const response = await request(app)
      .get('/api/fleet/analytics?period=invalid')
      .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(200);
    });
 
    test('should handle missing period parameter', async () => {
      const response = await request(app)
      .get('/api/fleet/analytics')
      .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(200);
      expect(response.body.data.period).toBe('day');
    });
 
    test('should handle database error', async () => {
      const originalQuery = mockPool.query;
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));
 
      const response = await request(app)
      .get('/api/fleet/analytics?period=day')
      .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      mockPool.query = originalQuery;
    });
  });
 
  describe('GET /api/fleet/vehicle/:vehicleId/scores', () => {
    test('should return daily scores for a vehicle', async () => {
      const response = await request(app)
      .get('/api/fleet/vehicle/V001/scores?days=7')
      .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicle_id).toBe('V001');
    });
 
    test('should handle non-existent vehicle with empty scores', async () => {
      const response = await request(app)
      .get('/api/fleet/vehicle/NONEXISTENT/scores?days=7')
      .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.scores).toBeDefined();
    });
 
    test('should handle database error', async () => {
      const originalQuery = mockPool.query;
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));
 
      const response = await request(app)
      .get('/api/fleet/vehicle/V001/scores?days=7')
      .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      mockPool.query = originalQuery;
    });
  });
});
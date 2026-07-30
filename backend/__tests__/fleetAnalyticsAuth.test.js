// added to cover the 401 error (invalid token) and the 403 error ( where a role is not permitted)
const request = require('supertest');
const app = require('../src/app');
const { mockQuery } = require('pg');
const generateToken = require('../tests/generateToken');
 
process.env.JWT_SECRET = 'test_secret_key';
process.env.NODE_ENV = 'test';
 
describe('Fleet Analytics API - auth & roles', () => {
  let managerToken;
  let viewerToken;
  let unapprovedRoleToken;
 
  beforeAll(() => {
    managerToken = generateToken(1, 'manager@test.com', 'fleet_manager');
    viewerToken = generateToken(2, 'viewer@test.com', 'viewer');
    // Any role string not in ('admin', 'fleet_manager', 'viewer') should be rejected -
    unapprovedRoleToken = generateToken(3, 'driver@test.com', 'driver');
  });
 
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });
 
  describe('GET /api/fleet/analytics', () => {
    it('should return 401 with no token', async () => {
      const response = await request(app).get('/api/fleet/analytics?period=day');
      expect(response.status).toBe(401);
    });
 
    it('here we expect it to return 401 with a malformed token', async () => {
      const response = await request(app)
        .get('/api/fleet/analytics?period=day')
        .set('Authorization', 'Bearer not-a-real-token');
      expect(response.status).toBe(401);
    });
 
    it('here we expect it return 200 for an allowed role (fleet_manager)', async () => {
      const response = await request(app)
        .get('/api/fleet/analytics?period=day')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(response.status).toBe(200);
    });
 
    it('here we expect it to return 200 for an allowed role (viewer)', async () => {
      const response = await request(app)
        .get('/api/fleet/analytics?period=day')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(response.status).toBe(200);
    });
 
    it('here it should return 403 for a role not permitted on this route', async () => {
      const response = await request(app)
        .get('/api/fleet/analytics?period=day')
        .set('Authorization', `Bearer ${unapprovedRoleToken}`);
      expect(response.status).toBe(403);
    });
  });
 
  describe('GET /api/fleet/vehicle/:vehicleId/scores', () => {
    it('over here it shoudl return 401 for no token', async () => {
      const response = await request(app).get('/api/fleet/vehicle/V001/scores');
      expect(response.status).toBe(401);
    });
 
    it('should return 200 for an allowed role (fleet_manager)', async () => {
      const response = await request(app)
        .get('/api/fleet/vehicle/V001/scores')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(response.status).toBe(200);
    });
 
    it('I expect the 403 error for a role that is not approved', async () => {
      const response = await request(app)
        .get('/api/fleet/vehicle/V001/scores')
        .set('Authorization', `Bearer ${unapprovedRoleToken}`);
      expect(response.status).toBe(403);
    });
  });
});
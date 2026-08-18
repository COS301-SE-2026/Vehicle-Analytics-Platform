jest.mock('../src/middleware/auth', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 1, role: 'fleet_manager', sub: 'test-sub' };
        next();
    },
    requireRole: (roles) => (req, res, next) => {
        if(!req.user){
            return res.status(401).json({ error: 'Unathorized'});
        }

        if(!roles.includes(req.user.role)){
            return res.status(403).json({ error: 'Insufficient permissions'});
        }
        next();
    },
}));

jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
    CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
        send:  jest.fn().mockResolvedValue({
            AuthenticationResult: {
                AccessToken: 'mock-sccess-token',
                IdToken: 'mock-id-token',
                RefreshToken: 'mock-refresh-token',
                ExpiresIn: 3600,
            },
            UserSub: 'mock-user-sub',
        }),
    })),
    SignUpCommand: jest.fn(),
    InitiateAuthCommand: jest.fn(),
    GlobalSignOutCommand: jest.fn(),
    AdminDisableUserCommand: jest.fn(),
    AdminUpdateUserAttributesCommand: jest.fn(),
}));

const { mockPool, mockQuery, setupMockData } = require('./setup/mockDb');
 
jest.mock('../src/db/pool', () => ({ pool: mockPool }));
 
const request = require('supertest');

const app = require('../src/app');
 

const BASE = '/api/custom-alerts';
 
const validRulePayload = {
  name: 'Speeding Rule',
  fleet_group_id: 1,
  condition_type: 'speed_threshold',
  condition_params: { max_speed_kmh: 120 },
};
 
describe('Custom Alert Rules Controller', () => {
  beforeEach(() => {
    setupMockData();
  });
 
  describe('POST /rules', () => {
    test('should create a rule when manager is assigned to the fleet group', async () => {
      mockQuery.mockImplementation((sql) => {

        const q = typeof sql === 'string' ? sql.toLowerCase() : '';

        if (q.includes('fleet_manager_assignments')) {
          return Promise.resolve({ rows: [{ '?column?': 1 }], rowCount: 1 });
        }

        if (q.includes('insert into custom_alert_rules')) {
          return Promise.resolve({
            rows: [{ id: 1, ...validRulePayload, status: 'active' }],
            rowCount: 1,
          });
        }

        return Promise.resolve({ rows: [], rowCount: 0 });
      });
 
      const response = await request(app)
        .post(`${BASE}/rules`)
        .set('Authorization', 'Bearer test-token')
        .send(validRulePayload);
 
      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);

      expect(response.body.data.name).toBe('Speeding Rule');
    });
 
    test('should reject with 400 when condition_params is invalid', async () => {

      const response = await request(app)
        .post(`${BASE}/rules`)
        .set('Authorization', 'Bearer test-token')
        .send({ ...validRulePayload, condition_params: { max_speed_kmh: -5 } });
 
      expect(response.status).toBe(400);

      expect(response.body.success).toBe(false);
    });
 
    test('should reject with 403 when manager is not assigned to the fleet group', async () => {

      mockQuery.mockImplementation((sql) => {

        const q = typeof sql === 'string' ? sql.toLowerCase() : '';
        
        if (q.includes('fleet_manager_assignments')) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });
 
      const response = await request(app)
        .post(`${BASE}/rules`)
        .set('Authorization', 'Bearer test-token')
        .send(validRulePayload);
 
      expect(response.status).toBe(403);

      expect(response.body.success).toBe(false);
    });
 
    test('should handle database error', async () => {
      mockQuery.mockImplementation((sql) => {

        const q = typeof sql === 'string' ? sql.toLowerCase() : '';

        if (q.includes('fleet_manager_assignments')) {
          return Promise.resolve({ rows: [{ '?column?': 1 }], rowCount: 1 });
        }

        return Promise.reject(new Error('Database error'));
      });
 
      const response = await request(app)
        .post(`${BASE}/rules`)
        .set('Authorization', 'Bearer test-token')
        .send(validRulePayload);
 
      expect(response.status).toBe(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /rules', () => {

    test('should return the manager\'s rules', async () => {

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, ...validRulePayload, status: 'active', fleet_group_name: 'North Fleet' }],
        rowCount: 1,
      });
 
      const response = await request(app)
        .get(`${BASE}/rules`)
        .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);

      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0].fleet_group_name).toBe('North Fleet');
    });
 
    test('should return an empty array when the manager has no rules', async () => {

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
 
      const response = await request(app)
        .get(`${BASE}/rules`)
        .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(200);

      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /rules/:id', () => {

    test('should return a single rule', async () => {

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, ...validRulePayload, status: 'active' }],
        rowCount: 1,
      });
 
      const response = await request(app)
        .get(`${BASE}/rules/1`)
        .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(200);

      expect(response.body.data.id).toBe(1);
    });
 
    test('should return 404 when the rule does not exist or belongs to another manager', async () => {

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
 
      const response = await request(app)
        .get(`${BASE}/rules/999`)
        .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(404);

      expect(response.body.success).toBe(false);
    });
  });

   describe('PUT /rules/:id', () => {

    test('should update a rule', async () => {

      mockQuery.mockImplementation((sql) => {

        const q = typeof sql === 'string' ? sql.toLowerCase() : '';

        if (q.includes('fleet_manager_assignments')) {
          return Promise.resolve({ rows: [{ '?column?': 1 }], rowCount: 1 });
        }

        if (q.includes('update custom_alert_rules')) {
          return Promise.resolve({
            rows: [{ id: 1, ...validRulePayload, name: 'Updated Rule', status: 'active' }],
            rowCount: 1,
          });
        }

        return Promise.resolve({ rows: [], rowCount: 0 });
      });
 
      const response = await request(app)
        .put(`${BASE}/rules/1`)
        .set('Authorization', 'Bearer test-token')
        .send({ ...validRulePayload, name: 'Updated Rule' });
 
      expect(response.status).toBe(200);

      expect(response.body.data.name).toBe('Updated Rule');
    });
 
    test('should return 404 when updating a rule that does not belong to the manager', async () => {

      mockQuery.mockImplementation((sql) => {

        const q = typeof sql === 'string' ? sql.toLowerCase() : '';

        if (q.includes('fleet_manager_assignments')) {
          return Promise.resolve({ rows: [{ '?column?': 1 }], rowCount: 1 });
        }

        return Promise.resolve({ rows: [], rowCount: 0 });
      });
 
      const response = await request(app)
        .put(`${BASE}/rules/999`)
        .set('Authorization', 'Bearer test-token')
        .send(validRulePayload);
 
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /rules/:id/status', () => {

    test('should activate/deactivate a rule', async () => {

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, ...validRulePayload, status: 'inactive' }],
        rowCount: 1,
      });
 
      const response = await request(app)
        .patch(`${BASE}/rules/1/status`)
        .set('Authorization', 'Bearer test-token')
        .send({ status: 'inactive' });
 
      expect(response.status).toBe(200);

      expect(response.body.data.status).toBe('inactive');
    });
 
    test('should reject an invalid status value', async () => {

      const response = await request(app)
        .patch(`${BASE}/rules/1/status`)
        .set('Authorization', 'Bearer test-token')
        .send({ status: 'paused' });
 
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /rules/:id', () => {

    test('should delete a rule', async () => {

      mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
 
      const response = await request(app)
        .delete(`${BASE}/rules/1`)
        .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(200);

      expect(response.body.data.id).toBe('1');
    });
 
    test('should return 404 when deleting a rule that does not exist', async () => {
      
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
 
      const response = await request(app)
        .delete(`${BASE}/rules/999`)
        .set('Authorization', 'Bearer test-token');
 
      expect(response.status).toBe(404);
    });
  });
});
 
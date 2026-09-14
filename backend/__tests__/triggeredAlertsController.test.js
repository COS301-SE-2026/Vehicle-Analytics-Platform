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

const BASE = '/api/alerts';

const sampleAlert = {
  id: 1,
  rule_id: 10,
  vehicle_id: 5,
  fleet_group_id: 1,
  condition_type: 'speed_threshold',
  breach_value: 140,
  threshold_value: 120,
  latitude: -25.7,
  longitude: 28.2,
  status: 'new',
  acknowledged_at: null,
  resolved_at: null,
  created_at: '2026-08-01T10:00:00.000Z',
  rule_snapshot: { max_speed_kmh: 120 },
};

// A jest.fn()-backed pool client for the transactional endpoints
// (acknowledge/resolve), separate from mockQuery which backs
// non-transactional pool.query calls.
function mockClientWith(handlers) {
  const client = {
    query: jest.fn((sql, params) => {
      const q = typeof sql === 'string' ? sql.toLowerCase() : '';

      for (const [match, handler] of handlers) {
        if (q.includes(match)) {
          return handler(q, params);
        }
      }

      if (q.includes('begin') || q.includes('commit') || q.includes('rollback')) {
        return Promise.resolve();
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    }),
    release: jest.fn(),
  };
  return client;
}

describe('Triggered Alerts Controller', () => {
    beforeEach(() => {
    setupMockData();
    mockPool.connect = jest.fn();
    mockQuery.mockClear();
  });

  describe('GET /alerts/triggered', () => {
    test('should return triggered alerts within the manager\'s accessible fleets', async () => {
      mockQuery.mockImplementation((sql) => {
        const q = typeof sql === 'string' ? sql.toLowerCase() : '';

        if (q.includes('fleet_manager_assignments')) {
          return Promise.resolve({ rows: [{ fleet_group_id: 1 }], rowCount: 1 });
        }

        if (q.includes('count(*)')) {
          return Promise.resolve({ rows: [{ total: '1' }], rowCount: 1 });
        }

        if (q.includes('from triggered_alerts')) {
          return Promise.resolve({ rows: [{ ...sampleAlert, rule_name: 'Speeding Rule' }], rowCount: 1 });
        }

        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const response = await request(app)
        .get(`${BASE}/triggered`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].rule_name).toBe('Speeding Rule');
      expect(response.body.data.pagination.total).toBe(1);
    });

    test('should return an empty array when the manager has no fleet assignments', async () => {
      mockQuery.mockImplementation((sql) => {
        const q = typeof sql === 'string' ? sql.toLowerCase() : '';

        if (q.includes('fleet_manager_assignments')) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const response = await request(app)
        .get(`${BASE}/triggered`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data.data).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });

    test('should reject with 403 when filtering by a fleet_group_id the manager cannot access', async () => {
      mockQuery.mockImplementation((sql) => {
        const q = typeof sql === 'string' ? sql.toLowerCase() : '';

        if (q.includes('fleet_manager_assignments')) {
          return Promise.resolve({ rows: [{ fleet_group_id: 1 }], rowCount: 1 });
        }

        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const response = await request(app)
        .get(`${BASE}/triggered`)
        .query({ fleet_group_id: 99 })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should compute hasMore correctly using parsed limit/offset', async () => {
      mockQuery.mockImplementation((sql) => {
        const q = typeof sql === 'string' ? sql.toLowerCase() : '';

        if (q.includes('fleet_manager_assignments')) {
          return Promise.resolve({ rows: [{ fleet_group_id: 1 }], rowCount: 1 });
        }

        if (q.includes('count(*)')) {
          return Promise.resolve({ rows: [{ total: '25' }], rowCount: 1 });
        }

        if (q.includes('from triggered_alerts')) {
          return Promise.resolve({ rows: [sampleAlert], rowCount: 1 });
        }

        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const response = await request(app)
        .get(`${BASE}/triggered`)
        .query({ limit: 10, offset: 10 })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data.pagination).toEqual({
        total: 25,
        limit: 10,
        offset: 10,
        hasMore: true,
      });
    });

    test('should handle database error', async () => {
      mockQuery.mockImplementation((sql) => {
        const q = typeof sql === 'string' ? sql.toLowerCase() : '';

        if (q.includes('fleet_manager_assignments')) {
          return Promise.resolve({ rows: [{ fleet_group_id: 1 }], rowCount: 1 });
        }

        return Promise.reject(new Error('Database error'));
      });

      const response = await request(app)
        .get(`${BASE}/triggered`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

    describe('GET /alerts/triggered/new', () => {
    test('should return new alerts created since the given timestamp', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ ...sampleAlert, fleet_group_name: 'North Fleet' }],
        rowCount: 1,
      });

      const response = await request(app)
        .get(`${BASE}/triggered/new`)
        .query({ since: '2026-08-01T00:00:00.000Z' })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toHaveLength(1);
      expect(response.body.data.alerts[0].fleet_group_name).toBe('North Fleet');
      expect(response.body.data.checked_at).toBeDefined();
    });

    test('should default to the last 60 seconds when since is omitted', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get(`${BASE}/triggered/new`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data.alerts).toEqual([]);

      const [, params] = mockQuery.mock.calls[0];
      const sinceParam = params[1];
      const diffMs = Date.now() - new Date(sinceParam).getTime();
      expect(diffMs).toBeGreaterThanOrEqual(60000);
      expect(diffMs).toBeLessThan(61000);
    });

    test('should reject with 400 for an invalid since parameter', async () => {
      const response = await request(app)
        .get(`${BASE}/triggered/new`)
        .query({ since: 'not-a-date' })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle database error', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`${BASE}/triggered/new`)
        .query({ since: '2026-08-01T00:00:00.000Z' })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /alerts/triggered/:id', () => {
    test('should return alert details with fleet group and rule context', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ ...sampleAlert, rule_name: 'Speeding Rule', fleet_group_name: 'North Fleet' }],
        rowCount: 1,
      });

      const response = await request(app)
        .get(`${BASE}/triggered/1`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fleet_group_name).toBe('North Fleet');
      expect(response.body.data.vehicle_link).toBe('/vehicles/5');
    });

    test('should return 404 when the alert does not exist or the manager lacks access', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get(`${BASE}/triggered/999`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should handle database error', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`${BASE}/triggered/1`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /alerts/triggered/:id/acknowledge', () => {
    test('should acknowledge a new alert', async () => {
      const client = mockClientWith([
        ['for update', () => Promise.resolve({ rows: [{ ...sampleAlert, status: 'new' }], rowCount: 1 })],
        ['fleet_manager_assignments', () => Promise.resolve({ rows: [{ '?column?': 1 }], rowCount: 1 })],
        ['update triggered_alerts', () => Promise.resolve({ rows: [{ ...sampleAlert, status: 'acknowledged' }], rowCount: 1 })],
      ]);
      mockPool.connect.mockResolvedValue(client);

      const response = await request(app)
        .put(`${BASE}/triggered/1/acknowledge`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.alert.status).toBe('acknowledged');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should return 404 when the alert does not exist', async () => {
      const client = mockClientWith([
        ['for update', () => Promise.resolve({ rows: [], rowCount: 0 })],
      ]);
      mockPool.connect.mockResolvedValue(client);

      const response = await request(app)
        .put(`${BASE}/triggered/999/acknowledge`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should return 403 when the manager is not assigned to the alert\'s fleet group', async () => {
      const client = mockClientWith([
        ['for update', () => Promise.resolve({ rows: [{ ...sampleAlert, status: 'new' }], rowCount: 1 })],
        ['fleet_manager_assignments', () => Promise.resolve({ rows: [], rowCount: 0 })],
      ]);
      mockPool.connect.mockResolvedValue(client);

      const response = await request(app)
        .put(`${BASE}/triggered/1/acknowledge`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should reject with 400 when the alert is not in "new" status', async () => {
      const client = mockClientWith([
        ['for update', () => Promise.resolve({ rows: [{ ...sampleAlert, status: 'acknowledged' }], rowCount: 1 })],
        ['fleet_manager_assignments', () => Promise.resolve({ rows: [{ '?column?': 1 }], rowCount: 1 })],
      ]);
      mockPool.connect.mockResolvedValue(client);

      const response = await request(app)
        .put(`${BASE}/triggered/1/acknowledge`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should handle database error', async () => {
      const client = mockClientWith([
        ['for update', () => Promise.reject(new Error('Database error'))],
      ]);
      mockPool.connect.mockResolvedValue(client);

      const response = await request(app)
        .put(`${BASE}/triggered/1/acknowledge`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('PUT /alerts/triggered/:id/resolve', () => {
    test('should resolve an acknowledged alert', async () => {
      const client = mockClientWith([
        ['for update', () => Promise.resolve({ rows: [{ ...sampleAlert, status: 'acknowledged' }], rowCount: 1 })],
        ['fleet_manager_assignments', () => Promise.resolve({ rows: [{ '?column?': 1 }], rowCount: 1 })],
        ['update triggered_alerts', () => Promise.resolve({ rows: [{ ...sampleAlert, status: 'resolved' }], rowCount: 1 })],
      ]);
      mockPool.connect.mockResolvedValue(client);

      const response = await request(app)
        .put(`${BASE}/triggered/1/resolve`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.alert.status).toBe('resolved');
    });

    test('should reject with 400 when the alert is still "new"', async () => {
      const client = mockClientWith([
        ['for update', () => Promise.resolve({ rows: [{ ...sampleAlert, status: 'new' }], rowCount: 1 })],
        ['fleet_manager_assignments', () => Promise.resolve({ rows: [{ '?column?': 1 }], rowCount: 1 })],
      ]);
      mockPool.connect.mockResolvedValue(client);

      const response = await request(app)
        .put(`${BASE}/triggered/1/resolve`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should reject with 400 when the alert is already resolved', async () => {
      const client = mockClientWith([
        ['for update', () => Promise.resolve({ rows: [{ ...sampleAlert, status: 'resolved' }], rowCount: 1 })],
        ['fleet_manager_assignments', () => Promise.resolve({ rows: [{ '?column?': 1 }], rowCount: 1 })],
      ]);
      mockPool.connect.mockResolvedValue(client);

      const response = await request(app)
        .put(`${BASE}/triggered/1/resolve`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 404 when the alert does not exist', async () => {
      const client = mockClientWith([
        ['for update', () => Promise.resolve({ rows: [], rowCount: 0 })],
      ]);
      mockPool.connect.mockResolvedValue(client);

      const response = await request(app)
        .put(`${BASE}/triggered/999/resolve`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });

    test('should return 403 when the manager is not assigned to the alert\'s fleet group', async () => {
      const client = mockClientWith([
        ['for update', () => Promise.resolve({ rows: [{ ...sampleAlert, status: 'acknowledged' }], rowCount: 1 })],
        ['fleet_manager_assignments', () => Promise.resolve({ rows: [], rowCount: 0 })],
      ]);
      mockPool.connect.mockResolvedValue(client);

      const response = await request(app)
        .put(`${BASE}/triggered/1/resolve`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(403);
    });

    test('should handle database error', async () => {
      const client = mockClientWith([
        ['for update', () => Promise.reject(new Error('Database error'))],
      ]);
      mockPool.connect.mockResolvedValue(client);

      const response = await request(app)
        .put(`${BASE}/triggered/1/resolve`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /alerts/count/new', () => {
    test('should return the count of new alerts across accessible fleets', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '4' }], rowCount: 1 });

      const response = await request(app)
        .get(`${BASE}/count/new`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(4);
    });

    test('should scope the count to a single fleet_group_id when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '1' }], rowCount: 1 });

      const response = await request(app)
        .get(`${BASE}/count/new`)
        .query({ fleet_group_id: 1 })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ta.fleet_group_id = $2'),
        [1, '1']
      );
    });

    test('should handle database error', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`${BASE}/count/new`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});

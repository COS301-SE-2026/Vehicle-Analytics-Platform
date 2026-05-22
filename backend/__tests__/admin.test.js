const request = require('supertest');
const app = require('../src/app');
const { mockQuery } = require('pg');
const generateToken = require('../tests/generateToken');

// Mock Cognito SDK
jest.mock('@aws-sdk/client-cognito-identity-provider', () => {
  const sendMock = jest.fn();
  return {
    CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
    AdminUpdateUserAttributesCommand: jest.fn(),
    AdminDisableUserCommand: jest.fn(),
    __sendMock: sendMock,
  };
});

const { __sendMock } = require('@aws-sdk/client-cognito-identity-provider');

process.env.JWT_SECRET = 'test_secret_key';
process.env.NODE_ENV = 'test';

describe('Admin Controller', () => {
  let adminToken;
  let viewerToken;
  let otherAdminToken;

  beforeAll(() => {
    adminToken = generateToken(1, 'admin@test.com', 'admin');
    viewerToken = generateToken(2, 'viewer@test.com', 'viewer');
    otherAdminToken = generateToken(3, 'other@test.com', 'admin');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- GET /api/admin/users ----
  test('GET /api/admin/users - no token → 401', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });
  test('GET /api/admin/users - non‑admin token → 403', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
  test('GET /api/admin/users - admin token → 200', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin', is_active: true }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
  test('GET /api/admin/users - database error → 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  // ---- PATCH /api/admin/users/:id/role ----
  test('PATCH /api/admin/users/:id/role - no token → 401', async () => {
    const res = await request(app)
      .patch('/api/admin/users/2/role')
      .send({ role: 'admin' });
    expect(res.status).toBe(401);
  });
  test('PATCH /api/admin/users/:id/role - invalid role → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/users/2/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'invalid' });
    expect(res.status).toBe(400);
  });
  test('PATCH /api/admin/users/:id/role - user not found → 404', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/admin/users/999/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(404);
  });
  test('PATCH /api/admin/users/:id/role - cannot change own role → 403', async () => {
    const res = await request(app)
      .patch('/api/admin/users/1/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'viewer' });
    expect(res.status).toBe(403);
  });
  test('PATCH /api/admin/users/:id/role - success → 200', async () => {
    __sendMock.mockResolvedValueOnce({});
    mockQuery
      .mockResolvedValueOnce({ rows: [{ cognito_sub: 'sub-2' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/admin/users/2/role')
      .set('Authorization', `Bearer ${otherAdminToken}`)
      .send({ role: 'fleet_manager' });
    expect(res.status).toBe(200);
  });
  test('PATCH /api/admin/users/:id/role - DB error after SELECT → 500', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ cognito_sub: 'sub-2' }] })
      .mockRejectedValueOnce(new Error('Update failed'));
    const res = await request(app)
      .patch('/api/admin/users/2/role')
      .set('Authorization', `Bearer ${otherAdminToken}`)
      .send({ role: 'fleet_manager' });
    expect(res.status).toBe(500);
  });

  // ---- DELETE /api/admin/users/:id ----
  test('DELETE /api/admin/users/:id - no token → 401', async () => {
    const res = await request(app).delete('/api/admin/users/2');
    expect(res.status).toBe(401);
  });
  test('DELETE /api/admin/users/:id - non‑admin → 403', async () => {
    const res = await request(app)
      .delete('/api/admin/users/2')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
  test('DELETE /api/admin/users/:id - cannot delete own account → 403', async () => {
    const res = await request(app)
      .delete('/api/admin/users/1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });
  test('DELETE /api/admin/users/:id - user not found → 404', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .delete('/api/admin/users/999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
  test('DELETE /api/admin/users/:id - success → 200', async () => {
    __sendMock.mockResolvedValueOnce({});
    mockQuery
      .mockResolvedValueOnce({ rows: [{ cognito_sub: 'sub-2' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .delete('/api/admin/users/2')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
  test('DELETE /api/admin/users/:id - DB error after SELECT → 500', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ cognito_sub: 'sub-2' }] })
      .mockRejectedValueOnce(new Error('Delete failed'));
    const res = await request(app)
      .delete('/api/admin/users/2')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });
});

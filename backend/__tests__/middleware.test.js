const request = require('supertest');
const app = require('../src/app');

process.env.JWT_SECRET = 'test_secret_key';
process.env.NODE_ENV = 'test';

describe('Auth Middleware', () => {
  test('should reject request without Authorization header', async () => {
    const res = await request(app).get('/api/vehicles/locations');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  test('should reject request with malformed Authorization header', async () => {
    const res = await request(app)
      .get('/api/vehicles/locations')
      .set('Authorization', 'Malformed');
    expect(res.status).toBe(401);
  });

  test('should reject request with invalid token', async () => {
    const res = await request(app)
      .get('/api/vehicles/locations')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });
});

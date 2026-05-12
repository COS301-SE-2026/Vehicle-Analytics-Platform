const request = require('supertest');
const app = require('../src/app');

describe('Health Check Endpoint', () => {
  test('GET /api/health should return status OK', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });
});

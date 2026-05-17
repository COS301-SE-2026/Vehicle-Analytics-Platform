const request = require('supertest');
const app = require('../src/app');

describe('App Routes', () => {
  test('GET /invalid-route should return 404', async () => {
    const response = await request(app).get('/invalid-route');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Route not found');
  });
});

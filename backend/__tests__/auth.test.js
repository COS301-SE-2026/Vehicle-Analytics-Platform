const request = require('supertest');
const app = require('../src/app');
const { mockQuery } = require('pg');

// Mock Cognito SDK – expose send mock via __sendMock property
jest.mock('@aws-sdk/client-cognito-identity-provider', () => {
  const sendMock = jest.fn();
  return {
    CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
    SignUpCommand: jest.fn(),
    InitiateAuthCommand: jest.fn(),
    GlobalSignOutCommand: jest.fn(),
    __sendMock: sendMock,
  };
});

const { __sendMock } = require('@aws-sdk/client-cognito-identity-provider');

process.env.JWT_SECRET = 'test_secret_key';
process.env.NODE_ENV = 'test';
process.env.DEMO_VIEWER_CODE = 'viewer-code';
process.env.DEMO_VIEWER_EMAIL = 'viewer@example.com';
process.env.DEMO_VIEWER_PASSWORD = 'ViewerPass1!';
process.env.DEMO_MANAGER_CODE = 'manager-code';
process.env.DEMO_MANAGER_EMAIL = 'manager@example.com';
process.env.DEMO_MANAGER_PASSWORD = 'ManagerPass1!';

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Validation
  test('POST /api/auth/register - missing fields → 400', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
  });
  test('POST /api/auth/register - short password → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@test.com', password: 'short' });
    expect(res.status).toBe(400);
  });
  test('POST /api/auth/register - invalid email → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'invalid', password: 'Test1234!' });
    expect(res.status).toBe(400);
  });

  // Success registration
  test('POST /api/auth/register - valid → 201', async () => {
    __sendMock.mockResolvedValueOnce({ UserSub: 'test-sub-123' });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New User', email: 'new@test.com', password: 'Test1234!' });
    expect(res.status).toBe(201);
  });

  // Cognito error
  test('POST /api/auth/register - Cognito error → 500', async () => {
    __sendMock.mockRejectedValueOnce(new Error('Network error'));
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Error', email: 'error@test.com', password: 'Test1234!' });
    expect(res.status).toBe(500);
  });

  // Login validation
  test('POST /api/auth/login - missing credentials → 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  // Login success
  test('POST /api/auth/login - valid → 200', async () => {
    __sendMock.mockResolvedValueOnce({
      AuthenticationResult: { AccessToken: 'fake', IdToken: 'fake', RefreshToken: 'fake', ExpiresIn: 3600 },
    });
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Test', email: 'test@test.com', role: 'viewer', is_active: true }],
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'Test1234!' });
    expect(res.status).toBe(200);
  });

  // Deactivated user
  test('POST /api/auth/login - deactivated user → 403', async () => {
    __sendMock.mockResolvedValueOnce({
      AuthenticationResult: { AccessToken: 'fake', IdToken: 'fake', RefreshToken: 'fake', ExpiresIn: 3600 },
    });
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 2, name: 'Inactive', email: 'inactive@test.com', role: 'viewer', is_active: false }],
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inactive@test.com', password: 'Test1234!' });
    expect(res.status).toBe(403);
  });

  // User missing in DB
  test('POST /api/auth/login - Cognito success but user missing in DB → 404', async () => {
    __sendMock.mockResolvedValueOnce({
      AuthenticationResult: { AccessToken: 'fake', IdToken: 'fake', RefreshToken: 'fake', ExpiresIn: 3600 },
    });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'missing@test.com', password: 'Test1234!' });
    expect(res.status).toBe(404);
  });

  // NotAuthorizedException
  test('POST /api/auth/login - NotAuthorizedException → 401', async () => {
    const error = new Error('Incorrect username or password');
    error.name = 'NotAuthorizedException';
    __sendMock.mockRejectedValueOnce(error);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@test.com', password: 'WrongPass!' });
    expect(res.status).toBe(401);
  });

  // UserNotFoundException
  test('POST /api/auth/login - UserNotFoundException → 404', async () => {
    const error = new Error('User does not exist');
    error.name = 'UserNotFoundException';
    __sendMock.mockRejectedValueOnce(error);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexist@test.com', password: 'Test1234!' });
    expect(res.status).toBe(404);
  });

  // Generic Cognito error
  test('POST /api/auth/login - generic Cognito error → 500', async () => {
    __sendMock.mockRejectedValueOnce(new Error('Cognito down'));
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'any@test.com', password: 'Test1234!' });
    expect(res.status).toBe(500);
  });

  describe('POST /api/auth/demo-login', () => {
    test('rejects an invalid role or code without calling Cognito', async () => {
      const res = await request(app)
        .post('/api/auth/demo-login')
        .send({ role: 'fleet_manager', code: 'manager-code' });

      expect(res.status).toBe(401);
      expect(__sendMock).not.toHaveBeenCalled();
    });

    test('rejects a missing demo configuration', async () => {
      const originalCode = process.env.DEMO_VIEWER_CODE;
      delete process.env.DEMO_VIEWER_CODE;

      const res = await request(app)
        .post('/api/auth/demo-login')
        .send({ role: 'viewer', code: 'viewer-code' });

      process.env.DEMO_VIEWER_CODE = originalCode;
      expect(res.status).toBe(401);
      expect(__sendMock).not.toHaveBeenCalled();
    });

    test('logs in the configured viewer account', async () => {
      __sendMock.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'viewer-access',
          IdToken: 'viewer-id',
          RefreshToken: 'viewer-refresh',
          ExpiresIn: 3600,
        },
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 3, name: 'Viewer', email: 'viewer@example.com', role: 'viewer', is_active: true }],
      });

      const res = await request(app)
        .post('/api/auth/demo-login')
        .send({ role: 'viewer', code: 'viewer-code' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('viewer');
      expect(res.body.data.idToken).toBe('viewer-id');
    });

    test('logs in the configured manager account', async () => {
      __sendMock.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'manager-access',
          IdToken: 'manager-id',
          RefreshToken: 'manager-refresh',
          ExpiresIn: 3600,
        },
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 4, name: 'Manager', email: 'manager@example.com', role: 'fleet_manager', is_active: true }],
      });

      const res = await request(app)
        .post('/api/auth/demo-login')
        .send({ role: 'manager', code: 'manager-code' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('fleet_manager');
      expect(res.body.data.user.email).toBe('manager@example.com');
    });
  });

  // Logout
  test('POST /api/auth/logout - without token → 401', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
  test('POST /api/auth/logout - with token → 200', async () => {
    const generateToken = require('../tests/generateToken');
    const token = generateToken(1, 'test@test.com', 'viewer');
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

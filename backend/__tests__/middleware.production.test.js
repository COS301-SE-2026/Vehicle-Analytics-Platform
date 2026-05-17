// This test runs the auth middleware in production mode (NODE_ENV !== 'test')
// to cover the Cognito verification branches that are skipped in test mode.
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'test_secret_key';
process.env.COGNITO_USER_POOL_ID = 'test-pool';
process.env.COGNITO_CLIENT_ID = 'test-client';

const { authenticate } = require('../src/middleware/auth');
const { mockQuery } = require('pg');
const jwt = require('jsonwebtoken');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

// Mock the Cognito verifier
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn().mockReturnValue({
      verify: jest.fn(),
    }),
  },
}));

describe('Auth Middleware - Production Mode', () => {
  let req, res, next;
  let verifierMock;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { headers: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    verifierMock = CognitoJwtVerifier.create().verify;
  });

  test('should call next() when token is valid and user exists and active', async () => {
    const token = jwt.sign({ sub: 'user123', email: 'test@test.com' }, 'test_secret_key');
    req.headers.authorization = `Bearer ${token}`;
    verifierMock.mockResolvedValueOnce({ sub: 'user123', email: 'test@test.com' });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', email: 'test@test.com', role: 'viewer', is_active: true }] });
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });

  test('should return 401 when user not found in DB', async () => {
    const token = jwt.sign({ sub: 'user123', email: 'test@test.com' }, 'test_secret_key');
    req.headers.authorization = `Bearer ${token}`;
    verifierMock.mockResolvedValueOnce({ sub: 'user123', email: 'test@test.com' });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'User not found' }));
  });

  test('should return 403 when user is inactive', async () => {
    const token = jwt.sign({ sub: 'user123', email: 'test@test.com' }, 'test_secret_key');
    req.headers.authorization = `Bearer ${token}`;
    verifierMock.mockResolvedValueOnce({ sub: 'user123', email: 'test@test.com' });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', email: 'test@test.com', role: 'viewer', is_active: false }] });
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Account deactivated' }));
  });

  test('should return 401 when token verification fails', async () => {
    const token = jwt.sign({ sub: 'user123', email: 'test@test.com' }, 'wrong_secret');
    req.headers.authorization = `Bearer ${token}`;
    verifierMock.mockRejectedValueOnce(new Error('Invalid token'));
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid or expired token' }));
  });
});

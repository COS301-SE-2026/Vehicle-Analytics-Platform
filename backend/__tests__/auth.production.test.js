const { authenticate } = require('../src/middleware/auth');
const { pool } = require('../src/db/pool');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../src/db/pool');
jest.mock('jsonwebtoken');

describe('Authenticate Middleware - Production Mode', () => {
  let req, res, next;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
    
    // Set to production mode to test production path
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  test('should return 401 if no token provided', async () => {
    req.headers.authorization = null;
    
    await authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'No token provided'
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 if token has no sub claim', async () => {
    req.headers.authorization = 'Bearer valid-token';
    jwt.decode.mockReturnValue({ email: 'test@example.com' });
    
    await authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Invalid token payload'
    }));
  });

  test('should return 401 if user not found in database', async () => {
    req.headers.authorization = 'Bearer valid-token';
    jwt.decode.mockReturnValue({ sub: 'cognito-sub-123', email: 'test@example.com' });
    pool.query.mockResolvedValue({ rows: [] });
    
    await authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'User not found'
    }));
  });

  test('should return 403 if account is deactivated', async () => {
    req.headers.authorization = 'Bearer valid-token';
    jwt.decode.mockReturnValue({ sub: 'cognito-sub-123', email: 'test@example.com' });
    pool.query.mockResolvedValue({ 
      rows: [{ id: 1, name: 'Test', email: 'test@example.com', role: 'viewer', is_active: false }] 
    });
    
    await authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Account deactivated'
    }));
  });

  test('should authenticate successfully and call next', async () => {
    req.headers.authorization = 'Bearer valid-token';
    jwt.decode.mockReturnValue({ sub: 'cognito-sub-123', email: 'test@example.com' });
    pool.query.mockResolvedValue({ 
      rows: [{ id: 1, name: 'Test', email: 'test@example.com', role: 'fleet_manager', is_active: true }] 
    });
    
    await authenticate(req, res, next);
    
    expect(req.user).toEqual({
      id: 1,
      sub: 'cognito-sub-123',
      email: 'test@example.com',
      role: 'fleet_manager'
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should return 401 on JWT decode error', async () => {
    req.headers.authorization = 'Bearer invalid-token';
    jwt.decode.mockImplementation(() => { throw new Error('Invalid token'); });
    
    await authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Invalid or expired token'
    }));
  });
});

const jwt = require('jsonwebtoken');
const { pool } = require('../db/pool');
const { error } = require('../utils/response');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const hasAuthHeader = authHeader && authHeader.startsWith('Bearer ');

  // Dev bypass — only when no token at all AND explicitly enabled
  if (
    process.env.NODE_ENV === 'development' &&
    !hasAuthHeader &&
    process.env.DEV_BYPASS_AUTH === 'true'
  ) {
    req.user = {
      id: 1,
      sub: 'local-dev',
      email: 'dev@localhost',
      role: 'manager',
    };
    return next();
  }

  if (!hasAuthHeader) {
    return error(res, 'No token provided', 401);
  }

  const token = authHeader.split(' ')[1];

  if (process.env.NODE_ENV === 'test') {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret_key');
      req.user = {
        id: decoded.id,
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };
      return next();
    } catch (err) {
      return error(res, 'Invalid or expired token', 401);
    }
  }

  // Decode first — anything wrong with the token itself is a true 401
  let payload;
  try {
    payload = jwt.decode(token);
  } catch (err) {
    return error(res, 'Invalid or expired token', 401);
  }

  if (!payload || !payload.sub) {
    return error(res, 'Invalid token payload', 401);
  }

  // Now hit the DB — a failure here is NOT a 401, it's a transient error
  let userResult;
  try {
    userResult = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE cognito_sub = $1',
      [payload.sub]
    );
  } catch (err) {
    console.error('Auth DB error:', err.message);
    return error(res, 'Authentication temporarily unavailable', 503);
  }

  if (!userResult?.rows?.length) {
    // User has a valid token but no DB row — treat as unauthorized
    return error(res, 'User not found', 401);
  }

  const user = userResult.rows[0];
  if (!user?.is_active) {
    return error(res, 'Account deactivated', 403);
  }

  req.user = {
    id: user.id,
    sub: payload.sub,
    email: user.email,
    role: user.role,
  };

  return next();
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.DEV_BYPASS_ROLES === 'true'
    ) {
      return next();
    }

    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return error(res, 'Insufficient permissions', 403);
    }
    next();
  };
}

module.exports = { authenticate, requireRole };

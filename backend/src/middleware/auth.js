const jwt = require('jsonwebtoken');
const { pool } = require('../db/pool');
const { error } = require('../utils/response');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

  try {
    // API Gateway already validates the Cognito JWT signature and expiration.
    // We only need to decode the payload to identify the user in our database.
    const payload = jwt.decode(token);

    if (!payload || !payload.sub) {
      return error(res, 'Invalid token payload', 401);
    }

    const userResult = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE cognito_sub = $1',
      [payload.sub]
    );

    if (!userResult?.rows?.length) {
      return error(res, 'User not found', 401);
    }

    const user = userResult.rows[0];
    if (!user?.is_active) {
      return error(res, 'Account deactivated', 403);
    }

    req.user = {
      id: user.id,
      sub: payload.sub,
      email: payload.email,
      role: user.role,
    };

    next();
  } catch (err) {
    const errorMsg = err?.message || 'Invalid or expired token';
    console.error('Auth error:', errorMsg);
    return error(res, 'Invalid or expired token', 401);
  }
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return error(res, 'Insufficient permissions', 403);
    }
    next();
  };
}

module.exports = { authenticate, requireRole };

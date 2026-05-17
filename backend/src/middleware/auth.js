const { CognitoJwtVerifier } = require('aws-jwt-verify');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/pool');
const { error } = require('../utils/response');

let verifier = null;

/* istanbul ignore next */
function getVerifier() {
  if (!verifier && process.env.NODE_ENV !== 'test') {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.COGNITO_CLIENT_ID,
    });
  }
  return verifier;
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'No token provided', 401);
  }

  const token = authHeader.split(' ')[1];

  // ----- TEST MODE: bypass Cognito -----
  if (process.env.NODE_ENV === 'test') {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret_key');
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        sub: decoded.sub,
      };
      return next();
    } catch (err) {
      return error(res, 'Invalid or expired token', 401);
    }
  }

  // ----- PRODUCTION MODE: Cognito verification -----
  /* istanbul ignore next */
  try {
    const verifier = getVerifier();
    const payload = await verifier.verify(token);

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

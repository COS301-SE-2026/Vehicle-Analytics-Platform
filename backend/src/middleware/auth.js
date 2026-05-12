const { CognitoJwtVerifier } = require('aws-jwt-verify');
const { pool } = require('../db/pool');
const { error } = require('../utils/response');

let verifier = null;

function getVerifier() {
  if (!verifier) {
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

  try {
    const verifier = getVerifier();
    const payload = await verifier.verify(token);

    const userResult = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE cognito_sub = $1',
      [payload.sub]
    );

    if (userResult.rows.length === 0) {
      return error(res, 'User not found', 401);
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
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

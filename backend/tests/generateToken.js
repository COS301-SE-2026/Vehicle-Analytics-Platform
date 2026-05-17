const jwt = require('jsonwebtoken');

function generateTestToken(userId, email, role) {
  const payload = {
    id: userId,
    email: email,
    role: role,
    sub: `test-sub-${userId}`,
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'test_secret_key', { expiresIn: '1h' });
}

module.exports = generateTestToken;

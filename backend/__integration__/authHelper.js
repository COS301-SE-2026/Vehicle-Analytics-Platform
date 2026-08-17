// backend/__integration__/authHelper.js

const jwt = require('jsonwebtoken');

function signTestToken({ id = 'itest-user', sub = 'itest-sub', email = 'itest@example.com', role = 'admin' } = {}) {
  return jwt.sign({ id, sub, email, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function authHeader(role = 'admin', overrides = {}) {
  return { Authorization: `Bearer ${signTestToken({ role, ...overrides })}` };
}
const asAdmin = () => authHeader('admin');
const asFleetManager = () => authHeader('fleet_manager');
const asViewer = () => authHeader('viewer');

module.exports = { signTestToken, authHeader, asAdmin, asFleetManager, asViewer };
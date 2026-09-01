const express = require('express');

const { generateReport, getReportScopes } = require('../controllers/reportController');

const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// nothing for a viewer to see because why would a viewer need to see reports ya know
const REPORTING_ROLES = ['admin', 'fleet_manager', 'manager'];

router.get('/scopes', authenticate, requireRole(REPORTING_ROLES), getReportScopes);

router.post('/generate', authenticate, requireRole(REPORTING_ROLES), generateReport);

module.exports = router;
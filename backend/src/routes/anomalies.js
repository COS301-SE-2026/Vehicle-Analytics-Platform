const express = require('express');
const { getAnomalies } = require('../controllers/anomalyController');
const { authenticate, requireRole } = require('../middleware/auth');
const router = express.Router();

const REPORTING_ROLES = ['admin', 'fleet_manager', 'manager'];

router.get('/', authenticate, requireRole(REPORTING_ROLES), getAnomalies);

module.exports = router;
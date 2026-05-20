const express = require('express');
const { getFleetKPIs, getActiveAlerts } = require('../controllers/dashboardController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/kpis', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getFleetKPIs);
router.get('/alerts', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getActiveAlerts);

module.exports = router;

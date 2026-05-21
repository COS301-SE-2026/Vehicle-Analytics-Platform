const express = require('express');
const { getFleetKPIs, getActiveAlerts, getFleetActivityHistory } = require('../controllers/dashboardController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/kpis', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getFleetKPIs);
router.get('/alerts', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getActiveAlerts);
router.get('/activity', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getFleetActivityHistory);

module.exports = router;

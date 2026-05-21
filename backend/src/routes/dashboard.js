const express = require('express');
const { getFleetKPIs, getActiveAlerts, getTotalDistanceToday } = require('../controllers/dashboardController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/kpis', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getFleetKPIs);
router.get('/alerts', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getActiveAlerts);
router.get('/total-distance', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getTotalDistanceToday);

module.exports = router;

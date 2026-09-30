const express = require('express');

const {
    getFleetKPIs,
    getActiveAlerts,
    getFleetActivityHistory,
    getTotalDistanceToday,
    getFleetStats,
} = require('../controllers/dashboardController');

const { authenticate, requireRole } = require('../middleware/auth');
const { requireFleetGroupAccess } = require('../middleware/fleetGroupAccess');

const router = express.Router();

// Viewers have no dashboard; they only see the live map.
const DASHBOARD_ROLES = ['admin', 'fleet_manager'];

router.use(authenticate, requireRole(DASHBOARD_ROLES), requireFleetGroupAccess);

router.get('/kpis', getFleetKPIs);
router.get('/alerts', getActiveAlerts);
router.get('/activity', getFleetActivityHistory);
router.get('/total-distance', getTotalDistanceToday);
router.get('/stats', getFleetStats);

module.exports = router;
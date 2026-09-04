

const express = require('express');

const {getFleetKPIs, getActiveAlerts, getFleetActivityHistory, getTotalDistanceToday, getFleetStats} = require('../controllers/dashboardController');



const {authenticate, requireRole} = require('../middleware/auth');
const { requireFleetGroupAccess } = require('../middleware/fleetGroupAccess');



const router = express.Router();



router.get('/kpis', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), requireFleetGroupAccess, getFleetKPIs);

router.get('/alerts', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), requireFleetGroupAccess, getActiveAlerts);

router.get('/activity', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), requireFleetGroupAccess, getFleetActivityHistory);

router.get('/total-distance', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), requireFleetGroupAccess, getTotalDistanceToday);

router.get('/stats', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), requireFleetGroupAccess, getFleetStats);



module.exports = router;


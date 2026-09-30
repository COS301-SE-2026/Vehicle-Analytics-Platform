const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { requireFleetGroupAccess } = require('../middleware/fleetGroupAccess');
const {
  getVehicleRisk,
  getFleetRisk,
  getCoachingHistory,
  getRiskNotifications,
  runPrediction,
  getSimilarVehicles,
} = require('../controllers/riskController');

const ALL = ['admin', 'manager', 'fleet_manager', 'viewer'];

router.get('/vehicle/:vehicleId',          authenticate, requireRole(ALL), requireFleetGroupAccess, getVehicleRisk);
router.get('/vehicle/:vehicleId/coaching', authenticate, requireRole(ALL), requireFleetGroupAccess, getCoachingHistory);
router.get('/vehicle/:vehicleId/similar',  authenticate, requireRole(ALL), requireFleetGroupAccess, getSimilarVehicles);
router.get('/fleet',                       authenticate, requireRole(ALL), requireFleetGroupAccess, getFleetRisk);
router.get('/notifications',               authenticate, requireRole(ALL), requireFleetGroupAccess, getRiskNotifications);
router.post('/run',                        authenticate, requireRole(['admin', 'manager', 'fleet_manager']), runPrediction);

module.exports = router;

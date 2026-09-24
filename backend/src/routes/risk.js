const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  getVehicleRisk,
  getFleetRisk,
  getCoachingHistory,
  getRiskNotifications,
  runPrediction,
  getSimilarVehicles,
} = require('../controllers/riskController');

const ALL = ['admin', 'manager', 'fleet_manager', 'viewer'];

router.get('/vehicle/:vehicleId',          authenticate, requireRole(ALL), getVehicleRisk);
router.get('/vehicle/:vehicleId/coaching', authenticate, requireRole(ALL), getCoachingHistory);
router.get('/vehicle/:vehicleId/similar',  authenticate, requireRole(ALL), getSimilarVehicles);
router.get('/fleet',                       authenticate, requireRole(ALL), getFleetRisk);
router.get('/notifications',               authenticate, requireRole(ALL), getRiskNotifications);
router.post('/run',                        authenticate, requireRole(['admin', 'manager', 'fleet_manager']), runPrediction);

module.exports = router;

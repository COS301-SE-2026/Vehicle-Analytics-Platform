const express = require('express');

const {
    getLiveLocations,
    getVehicleById,
    getVehiclePositionBuffer,
    getVehiclesList,
} = require('../controllers/vehicleController');

const {
    getVehicleSafetyTrend,
    getVehicleTrips,
} = require('../controllers/vehiclesController');

const { authenticate, requireRole } = require('../middleware/auth');
const router = express.Router();

const ALL_ROLES = ['admin', 'fleet_manager', 'viewer'];
router.get('/', authenticate, requireRole(ALL_ROLES), getVehiclesList);
router.get('/locations', authenticate, requireRole(ALL_ROLES), getLiveLocations);
router.get('/buffer', authenticate, requireRole(ALL_ROLES), getVehiclePositionBuffer);
router.get('/:vehicleId/trips', authenticate, requireRole(ALL_ROLES), getVehicleTrips);
router.get('/:vehicleId/safety-trend', authenticate, requireRole(ALL_ROLES), getVehicleSafetyTrend);

router.get('/:vehicleId', authenticate, requireRole(ALL_ROLES), getVehicleById);

module.exports = router;
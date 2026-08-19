const express = require('express');

const {
    getLiveLocations,
    getVehicleById,
    getVehiclePositionBuffer,
    getVehiclesList,
    assignVehicleToFleetGroup,
} = require('../controllers/vehicleController');

const {
    getVehicleSafetyTrend,
    getVehicleTrips,
} = require('../controllers/vehiclesController');

const { authenticate, requireRole } = require('../middleware/auth');
const { requireFleetGroupAccess} = require('../middleware/fleetGroupAccess');

const router = express.Router();

const ALL_ROLES = ['admin', 'fleet_manager', 'viewer'];
router.get('/', authenticate, requireRole(ALL_ROLES), requireFleetGroupAccess, getVehiclesList);
router.get('/locations', authenticate, requireRole(ALL_ROLES), requireFleetGroupAccess, getLiveLocations);
router.get('/buffer', authenticate, requireRole(ALL_ROLES), requireFleetGroupAccess, getVehiclePositionBuffer);
router.get('/:vehicleId/trips', authenticate, requireRole(ALL_ROLES), requireFleetGroupAccess, getVehicleTrips);
router.get('/:vehicleId/safety-trend', authenticate, requireRole(ALL_ROLES), requireFleetGroupAccess, getVehicleSafetyTrend);

router.get('/:vehicleId', authenticate, requireRole(ALL_ROLES), requireFleetGroupAccess, getVehicleById);
router.patch('/:vehicleId/fleet-group', authenticate, requireRole(['admin']), assignVehicleToFleetGroup);

module.exports = router;
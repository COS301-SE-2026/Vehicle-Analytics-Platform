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
const { requireFleetGroupAccess } = require('../middleware/fleetGroupAccess');
const { requireLiveMapAccess } = require('../middleware/liveMapAccess');

const router = express.Router();

// Viewers only get the live map: positions and the playback buffer.
const LIVE_MAP_ROLES = ['admin', 'fleet_manager', 'viewer'];
const MANAGER_ROLES = ['admin', 'fleet_manager'];

router.get('/locations', authenticate, requireRole(LIVE_MAP_ROLES), requireLiveMapAccess, getLiveLocations);
router.get('/buffer', authenticate, requireRole(LIVE_MAP_ROLES), requireLiveMapAccess, getVehiclePositionBuffer);

router.get('/', authenticate, requireRole(MANAGER_ROLES), requireFleetGroupAccess, getVehiclesList);
router.get('/:vehicleId/trips', authenticate, requireRole(MANAGER_ROLES), requireFleetGroupAccess, getVehicleTrips);
router.get('/:vehicleId/safety-trend', authenticate, requireRole(MANAGER_ROLES), requireFleetGroupAccess, getVehicleSafetyTrend);
router.get('/:vehicleId', authenticate, requireRole(MANAGER_ROLES), requireFleetGroupAccess, getVehicleById);
router.patch('/:vehicleId/fleet-group', authenticate, requireRole(['admin']), assignVehicleToFleetGroup);

module.exports = router;
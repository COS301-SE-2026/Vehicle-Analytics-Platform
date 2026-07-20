

const express = require('express');

const {getLiveLocations, getVehicleById, getVehiclePositionBuffer, getVehiclesList} = require('../controllers/vehicleController');


const {getVehicleSafetyTrend, getVehicleTrips} = require('../controllers/vehiclesController');

const {authenticate, requireRole} = require('../middleware/auth');




const router = express.Router();



router.get('/', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getVehiclesList);

router.get('/locations', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getLiveLocations);

router.get('/buffer', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getVehiclePositionBuffer);

router.get('/:vehicleId/trips', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getVehicleTrips);

router.get('/:vehicleId/safety-trend', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getVehicleSafetyTrend);

router.get('/:vehicleId', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getVehicleById);



module.exports = router;


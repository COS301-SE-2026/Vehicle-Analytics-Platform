const express = require('express');
const { getLiveLocations, getVehicleById, getVehiclePositionBuffer } = require('../controllers/vehicleController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/locations', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getLiveLocations);
router.get('/buffer', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getVehiclePositionBuffer);
router.get('/:vehicleId', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getVehicleById);



module.exports = router;

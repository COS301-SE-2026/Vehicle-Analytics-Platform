
const express = require('express');

const router = express.Router();


const {authenticate, requireRole} = require('../middleware/auth');


const {

    getVehicleFuelHistory,

    getFleetFuelHistory,
    getVehicleFuelTrend,

    calculateDailyHistory


} = require('../controllers/fuelHistoryController');


router.get('/vehicle/:vehicleId/history', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getVehicleFuelHistory);

router.get('/vehicle/:vehicleId/trend', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getVehicleFuelTrend);

router.get('/fleet/history', authenticate, requireRole(['admin', 'fleet_manager']), getFleetFuelHistory);

router.post('/vehicle/:vehicleId/calculate', authenticate, requireRole(['admin']), calculateDailyHistory);


module.exports = router;


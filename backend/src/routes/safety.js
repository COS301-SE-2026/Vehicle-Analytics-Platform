const express = require('express');


const { getVehicleSafetyScore, getFleetSafetyScores } = require('../controllers/safetyController');

const { authenticate, requireRole } = require('../middleware/auth');



const router = express.Router();



router.get('/scores', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getFleetSafetyScores);

router.get('/scores/:vehicleId', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getVehicleSafetyScore);



module.exports = router;


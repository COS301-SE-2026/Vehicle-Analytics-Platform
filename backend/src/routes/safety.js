const express = require('express');


const {getVehicleSafetyScore, getFleetSafetyScores} = require('../controllers/safetyController');

const {authenticate, requireRole} = require('../middleware/auth');
const { requireFleetGroupAccess } = require('../middleware/fleetGroupAccess');




const router = express.Router();



router.get('/scores', authenticate, requireRole(['admin','fleet_manager','viewer']), requireFleetGroupAccess, getFleetSafetyScores);



router.get('/scores/:vehicleId', authenticate, requireRole(['admin','fleet_manager','viewer']), requireFleetGroupAccess, getVehicleSafetyScore);



module.exports = router;


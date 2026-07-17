const express = require('express');


const {getFleetAnalytics, getVehicleDailyScores} = require('../controllers/fleetAnalyticsController');



const {authenticate, requireRole} = require('../middleware/auth');





const router = express.Router();



router.get('/analytics', authenticate, requireRole(['admin','fleet_manager','viewer']), getFleetAnalytics);



router.get('/vehicle/:vehicleId/scores', authenticate, requireRole(['admin','fleet_manager','viewer']), getVehicleDailyScores);



module.exports = router;




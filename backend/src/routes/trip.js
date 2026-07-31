const express = require('express');


const {getTripHistory, getTripReplay} = require('../controllers/tripController');



const {authenticate, requireRole} = require('../middleware/auth');



const router = express.Router();



router.get('/history/:vehicleId', authenticate, requireRole(['admin','fleet_manager','viewer']), getTripHistory);



router.get('/replay/:tripId', authenticate, requireRole(['admin','fleet_manager','viewer']), getTripReplay);




module.exports = router;


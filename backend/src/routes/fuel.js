



const express = require('express');

const router = express.Router();

const {authenticate, requireRole} = require('../middleware/auth');

const{

    getVehicleFuelStats,

    getFleetFuelSummary,

    getFuelDashboard,

    calculateTripFuel

} = require('../controllers/fuelController');



const ALL_ROLES = ['admin', 'fleet_manager', 'viewer'];

const MANAGER_ROLES = ['admin', 'fleet_manager'];





router.get('/vehicle/:vehicleId', authenticate, requireRole(ALL_ROLES), getVehicleFuelStats);




router.get('/fleet', authenticate, requireRole(ALL_ROLES), getFleetFuelSummary);




router.get('/dashboard', authenticate, requireRole(ALL_ROLES), getFuelDashboard);




router.post('/calculate/trip/:tripId', authenticate, requireRole(MANAGER_ROLES), calculateTripFuel);



module.exports = router;

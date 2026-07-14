const express = require('express');



const {


    createGeofence, getGeofences,




    getGeofenceById, updateGeofence,



    deleteGeofence,



    getGeofenceEvents,  discoverFrequentStops,


    createGeofenceFromCluster




} = require('../controllers/geofenceController');



const {authenticate, requireRole} = require('../middleware/auth');



const router = express.Router();





router.post('/', authenticate, requireRole(['admin','fleet_manager']), createGeofence);



router.get('/', authenticate, requireRole(['admin','fleet_manager','viewer']), getGeofences);



router.get('/events', authenticate, requireRole(['admin','fleet_manager','viewer']), getGeofenceEvents);



router.get('/:id', authenticate, requireRole(['admin','fleet_manager','viewer']), getGeofenceById);




router.put('/:id', authenticate, requireRole(['admin','fleet_manager']), updateGeofence);


router.delete('/:id', authenticate, requireRole(['admin','fleet_manager']), deleteGeofence);






router.get('/discover/stops', authenticate, requireRole(['admin','fleet_manager']), discoverFrequentStops);



router.post('/discover/create', authenticate, requireRole(['admin','fleet_manager']), createGeofenceFromCluster);



module.exports = router;






const express = require('express');

const{
    createGeofence,
    getGeofences,
    getGeofencesGeoJSON,
    getGeofenceById,
    updateGeofence,
    deleteGeofence,
    getGeofenceEvents,
    discoverFrequentStops,
    discoverFrequentEvents,
    createGeofenceFromCluster,
    deleteGeofenceEvents
}
= require('../controllers/geofenceController');

const {authenticate, requireRole} = require('../middleware/auth');
const router = express.Router();

router.post('/', authenticate, requireRole(['admin', 'fleet_manager']), createGeofence);
router.get('/', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getGeofences);
router.get('/geojson', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getGeofencesGeoJSON);
router.get('/events', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getGeofenceEvents);
router.get('/discover/stops', authenticate, requireRole(['admin', 'fleet_manager']), discoverFrequentStops);
router.get('/discover/events', authenticate, requireRole(['admin', 'fleet_manager']), discoverFrequentEvents);
router.post('/discover/create', authenticate, requireRole(['admin', 'fleet_manager']), createGeofenceFromCluster);
router.delete('/events', authenticate, requireRole(['admin', 'fleet_manager']), deleteGeofenceEvents);
router.get('/:id', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getGeofenceById);
router.put('/:id', authenticate, requireRole(['admin', 'fleet_manager']), updateGeofence);
router.delete('/:id', authenticate, requireRole(['admin', 'fleet_manager']), deleteGeofence);
module.exports = router;
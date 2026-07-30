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
    createGeofenceFromCluster
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
// /:id MUST stay below every literal path above (geojson, events,
// discover/*) -- as a catch-all param route, anything registered after
// it would get matched here instead. This was the actual cause of the
// 500: GET /geojson fell through to here with id="geojson", and since
// geofences.id is BIGINT, Postgres threw "invalid input syntax for type
// bigint" trying to run WHERE id = 'geojson'.
router.get('/:id', authenticate, requireRole(['admin', 'fleet_manager', 'viewer']), getGeofenceById);
router.put('/:id', authenticate, requireRole(['admin', 'fleet_manager']), updateGeofence);
router.delete('/:id', authenticate, requireRole(['admin', 'fleet_manager']), deleteGeofence);
module.exports = router;
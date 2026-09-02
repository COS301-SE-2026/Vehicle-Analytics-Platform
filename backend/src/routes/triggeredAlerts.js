const express = require('express');

const { authenticate, requireRole } = require('../middleware/auth');

const {
    listTriggeredAlerts,
    getAlertDetails,
    acknowledgeAlert,
    resolveAlert,
    getNewAlertCount,
    getNewTriggeredAlerts,
} = require('../controllers/triggeredAlertsController');

const router = express.Router();


router.use(authenticate);

router.use(requireRole(['manager', 'fleet_manager']));


router.get('/triggered', listTriggeredAlerts);

router.get('/triggered/new', getNewTriggeredAlerts);

router.get('/triggered/:id', getAlertDetails);


router.put('/triggered/:id/acknowledge', acknowledgeAlert);

router.put('/triggered/:id/resolve', resolveAlert);

router.get('/count/new', getNewAlertCount);


module.exports = router;
const express = require('express');

const {
    generateReport,
    getReportScopes,
    listReportHistory,
    getStoredReport,
    getStoredReportPdf,
    runScheduledHttp,
} = require('../controllers/reportController');

const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const REPORTING_ROLES = ['admin', 'fleet_manager', 'manager'];

function requireSchedulerToken(req, res, next) {
    const expected = process.env.REPORT_SCHEDULER_TOKEN;

    if (!expected) {
        return res.status(404).json({ success: false, error: 'Route not found' });
    }

    const provided = req.get('x-scheduler-token');

    if (!provided || provided !== expected) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    return next();
}

router.get('/scopes', authenticate, requireRole(REPORTING_ROLES), getReportScopes);
router.post('/generate', authenticate, requireRole(REPORTING_ROLES), generateReport);
router.post('/run-scheduled', requireSchedulerToken, runScheduledHttp);

router.get('/', authenticate, requireRole(REPORTING_ROLES), listReportHistory);
router.get('/:id', authenticate, requireRole(REPORTING_ROLES), getStoredReport);
router.get('/:id/pdf', authenticate, requireRole(REPORTING_ROLES), getStoredReportPdf);

module.exports = router;
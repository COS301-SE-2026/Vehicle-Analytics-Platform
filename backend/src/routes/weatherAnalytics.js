const express = require('express');
const { getEventProbability } = require('../controllers/weatherAnalyticsController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get(
  '/event-probability',
  authenticate,
  requireRole(['admin', 'fleet_manager']),
  getEventProbability
);

module.exports = router;
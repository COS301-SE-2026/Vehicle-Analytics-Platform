const express = require('express');

const {getNotifications} = require('../controllers/notificationsController');
const {authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const ALL_ROLES = ['admin', 'fleet_manager', 'viewer'];

router.get('/', authenticate, requireRole(ALL_ROLES), getNotifications);

module.exports = router;
const express = require('express');

const{
    listFleetGroups,
    assignFleetManager,
    removeFleetManagerAssignment,
} = require('../controllers/fleetGroupsController');

const {
    authenticate,
    requireRole
} = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireRole(['admin']), listFleetGroups);
router.post('/:id/assignments', authenticate, requireRole(['admin']), assignFleetManager);
router.delete('/:id/assignments/:managerId', authenticate, requireRole(['admin']), removeFleetManagerAssignment);

module.exports = router;
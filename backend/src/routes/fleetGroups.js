const express = require('express');

const{
    listFleetGroups,
    assignFleetManager,
    removeFleetManagerAssignment,
    bulkAssignVehiclesToGroup,
    listMyFleetGroups,
    createFleetGroup,
    listVehiclesForAssignment,
} = require('../controllers/fleetGroupsController');

const {
    authenticate,
    requireRole
} = require('../middleware/auth');
const { requireFleetGroupAccess } = require('../middleware/fleetGroupAccess');

const router = express.Router();

router.post('/', authenticate, requireRole(['admin']), createFleetGroup);
router.get('/', authenticate, requireRole(['admin']), listFleetGroups);
router.get('/:id/available-vehicles', authenticate, requireRole(['admin']), listVehiclesForAssignment);
router.get('/my-groups', authenticate, requireRole(['admin', 'fleet_manager']), requireFleetGroupAccess, listMyFleetGroups);
router.post('/:id/assignments', authenticate, requireRole(['admin']), assignFleetManager);
router.delete('/:id/assignments/:managerId', authenticate, requireRole(['admin']), removeFleetManagerAssignment);
router.patch('/:id/vehicles', authenticate, requireRole(['admin']), bulkAssignVehiclesToGroup);


module.exports = router;
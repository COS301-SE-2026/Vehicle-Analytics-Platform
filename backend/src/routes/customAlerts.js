const express = require('express');

const router = express.Router();

const { authenticate, requireRole } = require('../middleware/auth');

const controller = require('../controllers/customAlertRulesController');

router.use(authenticate);
router.use(requireRole(['manager', 'fleet_manager']));

router.post('/rules', controller.createRule);
router.get('/rules/:id', controller.getRule);
router.get('/rules', controller.listRules);
router.put('/rules/:id', controller.updateRule);
router.patch('/rules/:id/status', controller.setRuleStatus);
router.delete('/rules/:id', controller.deleteRule);

module.exports = router;
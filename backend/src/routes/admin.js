const express = require('express');
const { getAllUsers, updateUserRole, deactivateUser } = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/users', authenticate, requireRole(['admin']), getAllUsers);
router.patch('/users/:userId/role', authenticate, requireRole(['admin']), updateUserRole);
router.delete('/users/:userId', authenticate, requireRole(['admin']), deactivateUser);

module.exports = router;

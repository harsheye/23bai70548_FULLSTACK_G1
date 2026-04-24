const express = require('express');
const authenticateToken = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const {
  listUsers,
  updateUserControls,
  unblockUser,
  deleteUser,
  getAdminLogs,
} = require('../controllers/adminController');

const router = express.Router();

router.use(authenticateToken, requireAdmin);

router.get('/users', listUsers);
router.patch('/users/:userId', updateUserControls);
router.post('/users/:userId/unblock', unblockUser);
router.delete('/users/:userId', deleteUser);
router.get('/logs', getAdminLogs);

module.exports = router;

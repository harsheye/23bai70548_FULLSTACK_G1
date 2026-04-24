const express = require('express');
const { searchUsers } = require('../controllers/userController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.get('/search', authenticateToken, searchUsers);

module.exports = router;

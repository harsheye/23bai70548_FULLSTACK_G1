const express = require('express');
const router = express.Router();
const {
  requestRegistrationOtp,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  login,
  getProfile,
} = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Register endpoint
router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], handleValidationErrors, requestRegistrationOtp);

router.post('/register/verify-otp', [
  body('email').isEmail().withMessage('Valid email required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('A valid 6-digit OTP is required'),
], handleValidationErrors, verifyRegistrationOtp);

router.post('/register/resend-otp', [
  body('email').isEmail().withMessage('Valid email required'),
], handleValidationErrors, resendRegistrationOtp);

// Login endpoint
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], handleValidationErrors, login);

// Get profile endpoint
router.get('/profile', authenticateToken, getProfile);

module.exports = router;

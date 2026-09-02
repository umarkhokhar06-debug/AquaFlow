const express = require('express');
const authController = require('../controllers/authController');
const otpController = require('../controllers/otpController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Additive phone verification for signup (SRS OTP enhancement) -- optional,
// pre-registration step. Inert (503) until Twilio credentials are configured.
router.post('/phone/send-otp', otpController.sendOtp);
router.post('/phone/verify-otp', otpController.verifyOtp);

// Protected routes
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/push-token', authMiddleware, authController.updatePushToken);
router.put('/change-password', authMiddleware, authController.changePassword);
router.delete('/account', authMiddleware, authController.deleteAccount);

module.exports = router;

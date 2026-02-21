const express = require('express');
const { registerUser, loginUser, googleLogin, getAllParents, getAllDrivers, createDriver, sendOTP, verifyOTP, resetPassword } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.get('/parents', protect, admin, getAllParents);

// Admin-only driver management
router.get('/drivers', protect, admin, getAllDrivers);
router.post('/create-driver', protect, admin, createDriver);

// Forgot password OTP flow
router.post('/forgot-password', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;



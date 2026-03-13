const express = require('express');
const { registerUser, loginUser, googleLogin, getAllParents, getAllDrivers, createDriver, sendOTP, verifyOTP, resetPassword } = require('../controllers/authController');
const User = require('../models/User');
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

// FCM Token Management
router.post('/save-fcm-token', protect, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'Token is required' });

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.fcmToken = token;
        await user.save();

        res.json({ message: 'FCM token saved successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;



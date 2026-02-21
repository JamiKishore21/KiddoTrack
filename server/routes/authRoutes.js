const express = require('express');
const { registerUser, loginUser, googleLogin, getAllParents } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.get('/parents', protect, admin, getAllParents);

module.exports = router;

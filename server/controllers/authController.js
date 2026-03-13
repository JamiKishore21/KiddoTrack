const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer'); // To be removed, keeping for now to avoid breaking until Resend is active
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Nodemailer is deprecated here

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user (Manual)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            if (userExists.googleId && !userExists.password) {
                return res.status(400).json({ message: 'User already exists with Google. Please login with Google.' });
            }
            return res.status(400).json({ message: 'User already exists' });
        }

        // Public registration always creates a parent account
        const user = await User.create({
            name,
            email,
            password,
            role: 'parent'
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token (Manual)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user via Google
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
    const { token, role } = req.body; // Token from frontend

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { name, email, sub: googleId } = ticket.getPayload();
        console.log(`[GOOGLE LOGIN] Email: ${email}, Role Requested: ${role}`);

        let user = await User.findOne({ email });

        if (user) {
            console.log(`[GOOGLE LOGIN] User found: ${user.email}, Existing Role: ${user.role}`);
            // If user exists, update googleId if missing
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            console.log(`[GOOGLE LOGIN] Creating NEW user with role: ${role || 'parent'}`);
            // Create new user
            user = await User.create({
                name,
                email,
                googleId,
                role: role || 'parent',
                password: ''
            });
        }

        // ... rest of response ...


        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });

    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(401).json({ message: 'Google authentication failed' });
    }
};

// @desc    Get all users with role 'parent'
// @route   GET /api/auth/parents
// @access  Private/Admin
const getAllParents = async (req, res) => {
    try {
        const parents = await User.find({ role: 'parent' }).select('-password');
        res.json(parents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users with role 'driver'
// @route   GET /api/auth/drivers
// @access  Private/Admin
const getAllDrivers = async (req, res) => {
    try {
        const drivers = await User.find({ role: 'driver' }).select('-password').populate('assignedBus', 'busNumber plateNumber');
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a driver account (admin only)
// @route   POST /api/auth/create-driver
// @access  Private/Admin
const createDriver = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'An account with this email already exists.' });
        }

        const driver = await User.create({
            name,
            email,
            password,
            role: 'driver',
        });

        res.status(201).json({
            _id: driver._id,
            name: driver.name,
            email: driver.email,
            role: driver.role,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send OTP to email for password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const sendOTP = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email.' });
        }
        // Allow both manual and Google accounts — OTP email proves ownership

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash OTP before saving
        const salt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otpCode, salt);

        // Remove any existing OTP for this email, then save new one
        await OTP.deleteMany({ email });
        await OTP.create({ email, otp: hashedOtp });

        if (process.env.RESEND_API_KEY) {
            console.log(`[MAIL] Attempting to send OTP via Resend to ${email}...`);
            try {
                const { data, error } = await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
                    to: email,
                    subject: 'KiddoTrack — Password Reset OTP',
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
                            <h2 style="color:#4f46e5;margin-bottom:8px">KiddoTrack Password Reset</h2>
                            <p style="color:#374151">Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
                            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;padding:24px;background:#f0f0ff;border-radius:8px;color:#4f46e5;margin:24px 0">${otpCode}</div>
                            <p style="color:#6b7280;font-size:13px">If you did not request this, please ignore this email.</p>
                        </div>
                    `,
                });

                if (error) {
                    throw new Error(error.message);
                }

                console.log(`[MAIL] Email sent successfully via Resend to ${email}. ID: ${data.id}`);
                res.json({ message: 'OTP sent successfully to your email.' });
            } catch (mailError) {
                console.error('[MAIL ERR] Resend failed:', mailError.message);
                throw mailError; // Catch block will handle this
            }
        } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            // Legacy Nodemailer fallback (Gmail)
            const dynamicTransporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            console.log(`[MAIL] Attempting to send OTP via Nodemailer to ${email}...`);
            await dynamicTransporter.sendMail({
                from: `"KiddoTrack" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'KiddoTrack — Password Reset OTP',
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
                        <h2 style="color:#4f46e5;margin-bottom:8px">KiddoTrack Password Reset</h2>
                        <p style="color:#374151">Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
                        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;padding:24px;background:#f0f0ff;border-radius:8px;color:#4f46e5;margin:24px 0">${otpCode}</div>
                        <p style="color:#6b7280;font-size:13px">If you did not request this, please ignore this email.</p>
                    </div>
                `,
            });
            console.log(`[MAIL] Email sent successfully to ${email}`);
            res.json({ message: 'OTP sent successfully to your email.' });
        } else {
            // Development fallback: Log OTP to console
            console.log(`\n========================================`);
            console.log(`[DEV MODE] OTP for ${email}: ${otpCode}`);
            console.log(`========================================\n`);
            res.json({
                message: 'OTP generated! [DEV MODE] Check server console for the code.',
                devMode: true
            });
        }
    } catch (error) {
        console.error('sendOTP error:', error);
        res.status(500).json({ message: `Failed to send OTP: ${error.message}` });
    }
};

// @desc    Verify OTP and return a short-lived reset token
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const record = await OTP.findOne({ email });
        if (!record) {
            return res.status(400).json({ message: 'OTP has expired or was never sent. Please request a new one.' });
        }

        const isMatch = await bcrypt.compare(otp, record.otp);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
        }

        // OTP is valid — delete it so it can't be reused
        await OTP.deleteMany({ email });

        // Issue a short-lived reset token (15 min)
        const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });
        res.json({ resetToken });
    } catch (error) {
        console.error('verifyOTP error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset password using the reset token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    const { resetToken, newPassword } = req.body;
    try {
        const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        const user = await User.findOne({ email: decoded.email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.password = newPassword; // pre-save hook will hash it
        await user.save();

        res.json({ message: 'Password reset successfully! You can now log in with your new password.' });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'Reset session expired. Please start over.' });
        }
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, googleLogin, getAllParents, getAllDrivers, createDriver, sendOTP, verifyOTP, resetPassword };

const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

// Get notifications (specific bus or ALL for admins)
router.get('/bus/:busId', protect, async (req, res) => {
    try {
        let query = { busId: req.params.busId };

        // Let admins see everything if they request "ALL"
        if (req.params.busId === 'ALL' && req.user.role === 'admin') {
            query = {};
        }

        const notifications = await Notification.find(query)
            .sort({ timestamp: -1 })
            .limit(100);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark all notifications as read for the current user
router.put('/read-all', protect, async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const userId = new mongoose.Types.ObjectId(req.user._id);
        const { busId } = req.query;

        const query = { readBy: { $ne: userId } };
        if (busId) query.busId = busId;

        await Notification.updateMany(
            query,
            { $addToSet: { readBy: userId } }
        );
        res.json({ message: 'Notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

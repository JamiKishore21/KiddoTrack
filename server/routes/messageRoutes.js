const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');

// Get chat history for a specific bus
router.get('/bus/:busId', protect, async (req, res) => {
    try {
        const messages = await Message.find({ busId: req.params.busId })
            .sort({ timestamp: -1 })
            .limit(100);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

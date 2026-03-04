const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    busId: {
        type: String, // using busNumber/id string as used in existing code
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'delay', 'emergency'],
        default: 'info'
    },
    senderName: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);

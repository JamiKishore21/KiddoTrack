const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    busId: {
        type: String, // using busNumber/id string as used in existing code
        required: true
    },
    message: {
        type: String,
        required: true
    },
    sender: {
        type: String,
        enum: ['parent', 'driver'],
        required: true
    },
    parentName: {
        type: String
    },
    studentName: {
        type: String
    },
    driverName: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for auto-deletion after 60 days
// 60 days * 24 hours * 60 mins * 60 secs = 5184000
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 5184000 });

module.exports = mongoose.model('Message', messageSchema);

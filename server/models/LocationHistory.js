const mongoose = require('mongoose');

const locationHistorySchema = new mongoose.Schema({
    busId: {
        type: String, // Storing busNumber (e.g., "101") for easy query
        required: true,
        index: true
    },
    lat: {
        type: Number,
        required: true
    },
    lng: {
        type: Number,
        required: true
    },
    speed: Number,
    heading: Number,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// TTL Index: Automatically delete records older than 7 days (604800 seconds)
// This balances "Availability for Investigation" vs "Storage Costs"
locationHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('LocationHistory', locationHistorySchema);

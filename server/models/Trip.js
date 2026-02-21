const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
    bus: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        required: true,
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    route: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    startTime: {
        type: Date,
        default: Date.now,
    },
    endTime: {
        type: Date,
    },
    locations: [{
        lat: Number,
        lng: Number,
        timestamp: {
            type: Date,
            default: Date.now
        },
        speed: Number, // Optional: km/h
    }]
}, {
    timestamps: true,
});

const Trip = mongoose.model('Trip', tripSchema);
module.exports = Trip;

const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true, // e.g., "Route A - Downtown"
    },
    stops: [{
        name: String,
        location: {
            lat: Number,
            lng: Number
        },
        order: {
            type: Number,
            default: 0
        },
        arrivalTime: String,   // e.g. "08:00 AM" (scheduled)
        departureTime: String, // e.g. "08:02 AM" (scheduled)
        actualTime: String,    // e.g. "02:05 PM" (when marked reached)
        delayMinutes: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['pending', 'reached', 'left'],
            default: 'pending'
        }
    }],
    assignedBus: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
    }
}, {
    timestamps: true,
});

const Route = mongoose.model('Route', routeSchema);
module.exports = Route;

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
        arrivalTime: String, // e.g. "08:00 AM" (scheduled)
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

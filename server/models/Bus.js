const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
    plateNumber: {
        type: String,
        required: true,
        unique: true,
    },
    busNumber: {
        type: String,
        required: true,
    },
    capacity: {
        type: Number,
        required: true,
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // One bus usually has one main driver, or we can leave empty if unassigned
    },
    school: {
        type: String, // Could be an ObjectId if we had a School model, string for now
        default: 'Main School'
    },
    status: {
        type: String,
        enum: ['active', 'maintenance', 'inactive'],
        default: 'active',
    },
    lastLocation: {
        lat: Number,
        lng: Number,
        lastUpdated: Date,
        speed: Number, // Optional but useful context
        heading: Number
    }
}, {
    timestamps: true,
});

const Bus = mongoose.model('Bus', busSchema);
module.exports = Bus;

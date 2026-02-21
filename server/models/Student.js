const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    bus: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
    },
    route: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
    },
    stop: {
        name: String,
        lat: Number,
        lng: Number,
        time: String
    }
}, {
    timestamps: true,
});

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;

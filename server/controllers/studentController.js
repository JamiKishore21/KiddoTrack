const Student = require('../models/Student');
const User = require('../models/User');

// @desc    Get all students
// @route   GET /api/students
// @access  Private/Admin
const getStudents = async (req, res) => {
    try {
        const students = await Student.find()
            .populate('parent', 'username email')
            .populate('bus', 'busNumber plateNumber');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get students for logged in parent
// @route   GET /api/students/my
// @access  Private/Parent
const getMyStudents = async (req, res) => {
    try {
        const students = await Student.find({ parent: req.user._id })
            .populate('bus', 'busNumber plateNumber');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a student
// @route   POST /api/students
// @access  Private/Admin
const createStudent = async (req, res) => {
    const { name, parentId, busId, routeId, stop } = req.body;

    try {
        // Validate Parent
        const parent = await User.findById(parentId);
        if (!parent || parent.role !== 'parent') {
            return res.status(400).json({ message: 'Invalid parent ID' });
        }

        const student = await Student.create({
            name,
            parent: parentId,
            bus: busId,
            route: routeId,
            stop
        });

        res.status(201).json(student);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getStudents,
    getMyStudents,
    createStudent,
};

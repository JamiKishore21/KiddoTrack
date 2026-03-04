const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getStudents,
    getMyStudents,
    createStudent,
    updateStudent,
    deleteStudent
} = require('../controllers/studentController');

router.get('/', protect, admin, getStudents);
router.post('/', protect, admin, createStudent);
router.get('/my', protect, getMyStudents);
router.route('/:id')
    .put(protect, admin, updateStudent)
    .delete(protect, admin, deleteStudent);

module.exports = router;

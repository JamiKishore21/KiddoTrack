const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getStudents, createStudent, getMyStudents } = require('../controllers/studentController');

router.route('/')
    .get(protect, admin, getStudents)
    .post(protect, admin, createStudent);

router.route('/my')
    .get(protect, getMyStudents);

module.exports = router;

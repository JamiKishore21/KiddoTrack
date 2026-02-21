const express = require('express');
const { getBuses, createBus, assignDriver } = require('../controllers/busController');
// const { protect, admin } = require('../middleware/authMiddleware'); // Middleware TO BE IMPLEMENTED

const router = express.Router();

// TODO: Add auth middleware later. For now, open for development speed or check role in controller if needed.
router.route('/').get(getBuses).post(createBus);
router.route('/:id/assign').put(assignDriver);

module.exports = router;

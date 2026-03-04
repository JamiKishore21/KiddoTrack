const express = require('express');
const { getRoutes, createRoute, updateRoute, deleteRoute } = require('../controllers/routeController');

const router = express.Router();

router.route('/').get(getRoutes).post(createRoute);
router.route('/:id').put(updateRoute).delete(deleteRoute);

module.exports = router;

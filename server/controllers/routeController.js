const Route = require('../models/Route');

// @desc    Get all routes
// @route   GET /api/routes
// @access  Private
const getRoutes = async (req, res) => {
    try {
        const routes = await Route.find({}).populate('assignedBus', 'busNumber plateNumber');
        res.json(routes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new route
// @route   POST /api/routes
// @access  Private (Admin)
const createRoute = async (req, res) => {
    const { name, stops, assignedBus } = req.body; // stops: [{name, location: {lat, lng}, arrivalTime}]

    try {
        const route = await Route.create({
            name,
            stops: stops || [], // Should validate structure ideally
            assignedBus: assignedBus || null
        });

        res.status(201).json(route);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update route (e.g. assign bus)
// @route   PUT /api/routes/:id
const updateRoute = async (req, res) => {
    try {
        const route = await Route.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(route);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


module.exports = { getRoutes, createRoute, updateRoute };

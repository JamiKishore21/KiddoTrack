const Bus = require('../models/Bus');
const User = require('../models/User');

// @desc    Get all buses
// @route   GET /api/buses
// @access  Private (Admin/Driver/Parent - mostly Admin)
const getBuses = async (req, res) => {
    try {
        const buses = await Bus.find({}).populate('driver', 'name email');
        res.json(buses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new bus
// @route   POST /api/buses
// @access  Private (Admin only)
const createBus = async (req, res) => {
    const { busNumber, plateNumber, capacity, driverId } = req.body;

    try {
        const busExists = await Bus.findOne({ plateNumber });

        if (busExists) {
            return res.status(400).json({ message: 'Bus with this plate number already exists' });
        }

        const bus = await Bus.create({
            busNumber,
            plateNumber,
            capacity,
            driver: driverId || null
        });

        // If a driver is assigned, update the User model specifically? 
        // Ideally we keep the link in both or just one. Bus -> Driver is usually sufficient for this app.

        res.status(201).json(bus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Assign driver to bus
// @route   PUT /api/buses/:id/assign
// @access  Private (Admin)
const assignDriver = async (req, res) => {
    const { driverId } = req.body;
    try {
        const bus = await Bus.findById(req.params.id);
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        bus.driver = driverId;
        await bus.save();

        // Optional: Update User model to reflect assignment if needed

        res.json(bus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Update a bus
// @route   PUT /api/buses/:id
const updateBus = async (req, res) => {
    try {
        const { busNumber, plateNumber, capacity, driverId } = req.body;
        const updateData = { busNumber, plateNumber, capacity };
        if (driverId !== undefined) {
            updateData.driver = driverId === '' ? null : driverId;
        }

        const bus = await Bus.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('driver', 'name email');
        if (!bus) return res.status(404).json({ message: 'Bus not found' });
        res.json(bus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a bus
// @route   DELETE /api/buses/:id
const deleteBus = async (req, res) => {
    try {
        const bus = await Bus.findByIdAndDelete(req.params.id);
        if (!bus) return res.status(404).json({ message: 'Bus not found' });
        res.json({ message: 'Bus removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getBuses, createBus, assignDriver, updateBus, deleteBus };

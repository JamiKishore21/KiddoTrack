const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const authRoutes = require('./routes/authRoutes');
const busRoutes = require('./routes/busRoutes');
const routeRoutes = require('./routes/routeRoutes');

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/students', require('./routes/studentRoutes'));

// Basic Route
app.get('/', (req, res) => {
    res.send('KiddoTrack API is running');
});

const parentSessions = {}; // Global Cache
const activeBusSessions = {}; // Global Cache

// Socket.io connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a room (e.g., "bus_123" for parents tracking bus 123)

    // Join a room (e.g., "bus_123" for parents tracking bus 123)
    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);

        // If a DRIVER joins, send them the list of currently online parents immediately
        if (room.endsWith('_driver')) {
            const busId = room.split('_')[1]; // Extract ID from "bus_123_driver"
            const activeParents = Object.values(parentSessions).filter(p => p.busId === busId);
            socket.emit('activeParentsList', activeParents);
            console.log(`[SOCKET] Syncing ${activeParents.length} active parents to driver in ${room}`);
        }

        // If ADMIN joins, send them list of ALL active buses
        if (room === 'admin_room') {
            const activeBuses = Object.values(activeBusSessions);
            socket.emit('activeBusList', activeBuses);
            console.log(`[SOCKET] Syncing ${activeBuses.length} active buses to Admin`);
        }
    });

    const Bus = require('./models/Bus'); // Import Bus Model
    const LocationHistory = require('./models/LocationHistory'); // Import History Model

    // ... (existing code) ...

    // Driver sends location
    socket.on('driverLocation', async (data) => {
        // Cache this bus location (RAM)
        activeBusSessions[data.busId] = data;

        // Broadcast to everyone listening (Real-time)
        io.to(`bus_${data.busId}`).emit('busLocationUpdate', data);
        io.to('admin_room').emit('busLocationUpdate', data);

        // PERSISTENCE LAYER
        try {
            // 1. Update "Last Known" (Fast, Single Record)
            await Bus.findOneAndUpdate(
                { busNumber: data.busId },
                {
                    lastLocation: {
                        lat: data.lat,
                        lng: data.lng,
                        speed: data.speed,
                        heading: data.heading,
                        lastUpdated: new Date()
                    }
                }
            );

            // 2. Append to History Log (For Police/Investigation)
            // We use 'await' but inside a non-blocking Promise.all if high load, 
            // but for now simple await is fine or fire-and-forget without await.
            // Using create is safer for logs.
            await LocationHistory.create({
                busId: data.busId,
                lat: data.lat,
                lng: data.lng,
                speed: data.speed, // Useful for accident reconstruction
                heading: data.heading
            });

        } catch (err) {
            console.error('Error persisting bus location:', err);
        }
    });

    // Driver Ends Trip
    socket.on('driverSessionEnd', (data) => {
        // Remove from cache
        if (activeBusSessions[data.busId]) {
            delete activeBusSessions[data.busId];
        }

        // Notify Admin to remove marker
        io.to('admin_room').emit('busSessionEnded', { busId: data.busId });
        console.log(`Bus ${data.busId} ended session.`);
    });

    // Parent sends location (for Driver to see)
    socket.on('parentLocation', (data) => {
        // Cache this session
        parentSessions[socket.id] = data;

        // Broadcast ONLY to the driver of this bus
        io.to(`bus_${data.busId}_driver`).emit('parentLocationUpdate', data);
        console.log(`[SOCKET] Parent of ${data.studentName} sent location to bus_${data.busId}_driver`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const session = parentSessions[socket.id];
        if (session) {
            // Notify driver that parent left (Optional feature, but good for cleanup)
            io.to(`bus_${session.busId}_driver`).emit('parentLeft', { studentName: session.studentName });
            delete parentSessions[socket.id];
        }
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const Notification = require('./models/Notification');
const Message = require('./models/Message');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');

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
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

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

    // Driver broadcasts a status/traffic update to all parents on this bus AND Admin
    socket.on('driverStatusUpdate', async (data) => {
        // data: { busId, message, type, driverName } — type: 'info' | 'delay' | 'emergency'
        const broadcastData = {
            ...data,
            timestamp: new Date().toISOString()
        };

        // Persist to Database for "WhatsApp-style" history
        try {
            await Notification.create({
                busId: data.busId,
                message: data.message,
                type: data.type,
                senderName: data.driverName
            });
        } catch (dbErr) {
            console.error('[DB ERR] Failed to save notification:', dbErr);
        }

        io.to(`bus_${data.busId}`).emit('busStatusUpdate', broadcastData);
        io.to('admin_room').emit('busStatusUpdate', broadcastData); // Alert Admin too
        console.log(`[STATUS] Bus ${data.busId} (${data.type}): ${data.message}`);
    });

    // Parent sends a message to the driver of a specific bus
    socket.on('parentMessage', async (data) => {
        // data: { busId, message, parentName, studentName }
        const timestamp = new Date().toISOString();
        const msgPayload = {
            ...data,
            timestamp
        };

        // Broadcast to driver
        io.to(`bus_${data.busId}_driver`).emit('incomingParentMessage', msgPayload);

        // Save to DB for persistence
        try {
            await Message.create({
                busId: data.busId,
                message: data.message,
                sender: 'parent',
                parentName: data.parentName,
                studentName: data.studentName,
                timestamp
            });
        } catch (dbErr) {
            console.error('[DB ERR] Failed to save parent message:', dbErr);
        }

        console.log(`[MSG] Parent of ${data.studentName} → Bus ${data.busId}: ${data.message}`);
    });

    // Driver sends a message to parents tracking the bus
    socket.on('driverMessage', async (data) => {
        // data: { busId, message, driverName }
        const timestamp = new Date().toISOString();
        const msgPayload = {
            ...data,
            timestamp,
            sender: 'driver'
        };

        // Broadcast to all parents tracking this bus
        io.to(`bus_${data.busId}`).emit('incomingParentMessage', msgPayload);

        // Save to DB
        try {
            await Message.create({
                busId: data.busId,
                message: data.message,
                sender: 'driver',
                driverName: data.driverName,
                timestamp
            });
        } catch (dbErr) {
            console.error('[DB ERR] Failed to save driver message:', dbErr);
        }

        console.log(`[MSG] Driver of Bus ${data.busId} → Parents: ${data.message}`);
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

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`   Run this command to free it: netstat -ano | findstr :${PORT}`);
        console.error(`   Then run: taskkill /F /PID <PID from above>\n`);
        process.exit(1);
    } else {
        throw err;
    }
});


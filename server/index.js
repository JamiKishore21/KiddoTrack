const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const Notification = require('./models/Notification');
const Message = require('./models/Message');
const { sendPushToBusParents } = require('./utils/pushService');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const sanitizeOrigin = (url) => {
    if (!url) return null;
    let sanitized = url.trim().replace(/\/$/, '');
    if (!sanitized.startsWith('http')) {
        sanitized = `https://${sanitized}`;
    }
    return sanitized;
};

const ALLOWED_ORIGINS = [
    sanitizeOrigin(process.env.FRONTEND_URL),
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost",
    "capacitor://localhost",
    "https://kiddo-track.vercel.app"
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow if:
        // 1. No origin (mobile app, server-to-server)
        // 2. In our explicit list
        // 3. Any localhost or capacitor origin
        // 4. Any vercel.app subdomain
        if (!origin ||
            ALLOWED_ORIGINS.includes(origin) ||
            origin.includes('localhost') ||
            origin.startsWith('capacitor://') ||
            origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            console.log('[CORS] Blocked Origin:', origin);
            callback(null, false); // No error, just no header
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
};

const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"]
    }
});

const authRoutes = require('./routes/authRoutes');
const busRoutes = require('./routes/busRoutes');
const routeRoutes = require('./routes/routeRoutes');

app.use(cors(corsOptions));
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

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        time: new Date().toISOString()
    });
});

const parentSessions = {}; // Global Cache
const activeBusSessions = {}; // Global Cache

// Auto-expire stale bus sessions (if driver closes app without pressing Stop)
// A session is considered stale if no location update received for 5 minutes
setInterval(() => {
    const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    Object.keys(activeBusSessions).forEach((busId) => {
        const session = activeBusSessions[busId];
        if (session._lastUpdated && (now - session._lastUpdated) > STALE_THRESHOLD_MS) {
            console.log(`[SESSION] Bus ${busId} session expired due to inactivity.`);
            delete activeBusSessions[busId];
            // Notify admin and parents that bus is offline
            io.to('admin_room').emit('busSessionEnded', { busId });
            io.to(`bus_${busId}`).emit('busSessionEnded', { busId });
        }
    });
}, 60 * 1000); // Check every 1 minute

// Socket.io connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);

        if (room.startsWith('bus_') && !room.endsWith('_driver')) {
            const busId = room.split('_')[1];
            if (activeBusSessions[busId]) {
                socket.emit('busLocationUpdate', activeBusSessions[busId]);
                console.log(`[SOCKET] Immediate location sync for bus ${busId} to parent ${socket.id}`);
            }
        }

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
        // VALIDATION: Ignore invalid (0,0) or missing coordinates
        if (!data.lat || !data.lng || (Number(data.lat) === 0 && Number(data.lng) === 0)) {
            return;
        }

        // Cache this bus location (RAM) — store timestamp for stale-session detection
        activeBusSessions[data.busId] = { ...data, _lastUpdated: Date.now() };

        // Broadcast to everyone listening (Real-time)
        io.to(`bus_${data.busId}`).emit('busLocationUpdate', data);
        io.to('admin_room').emit('busLocationUpdate', data);

        // PERSISTENCE LAYER
        try {
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

            await LocationHistory.create({
                busId: data.busId,
                lat: data.lat,
                lng: data.lng,
                speed: data.speed,
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

        // Notify Admin AND all parents tracking this bus to remove the marker
        io.to('admin_room').emit('busSessionEnded', { busId: data.busId });
        io.to(`bus_${data.busId}`).emit('busSessionEnded', { busId: data.busId });
        console.log(`[SESSION] Bus ${data.busId} trip ended cleanly.`);
    });

    const { calculateDelay, formatMinutesToTime, parseTimeToMinutes } = require('./utils/timeUtils');

    // Driver marks a stop as reached/left
    socket.on('stopReached', async (data) => {
        // data: { busId, stopIndex, status, stopName, timestamp }
        const payload = { ...data, timestamp: data.timestamp || new Date().toISOString() };
        try {
            const Bus = require('./models/Bus');
            const Route = require('./models/Route');
            const bus = await Bus.findOne({ busNumber: data.busId });
            if (bus) {
                const route = await Route.findOne({ assignedBus: bus._id });
                if (route && route.stops[data.stopIndex]) {
                    const currentStop = route.stops[data.stopIndex];
                    currentStop.status = data.status;

                    if (data.status === 'reached') {
                        // Calculate delay based on IST
                        const schedMin = parseTimeToMinutes(currentStop.arrivalTime);
                        const eventDate = new Date(payload.timestamp);

                        // IST is UTC + 5:30
                        const istDate = new Date(eventDate.getTime() + (5.5 * 60 * 60 * 1000));
                        const istH = istDate.getUTCHours();
                        const istM = istDate.getUTCMinutes();

                        const actualMin = istH * 60 + istM;
                        const delay = schedMin !== null ? (actualMin - schedMin) : 0;

                        currentStop.delayMinutes = delay;
                        currentStop.actualTime = formatMinutesToTime(actualMin);

                        // Propagate delay to all future stops
                        for (let i = data.stopIndex + 1; i < route.stops.length; i++) {
                            route.stops[i].delayMinutes = delay;
                        }
                    } else if (data.status === 'left') {
                        // Maintain the last known delay if bus has left
                    }

                    route.markModified('stops');
                    await route.save();

                    // Broadcast updated route to everyone
                    payload.updatedStops = route.stops;
                }
            }
        } catch (err) { console.error('[STOP] DB save error:', err.message); }
        io.to(`bus_${data.busId}`).emit('stopStatusUpdate', payload);
        io.to('admin_room').emit('stopStatusUpdate', payload);
    });

    // Reset Trip Logic
    socket.on('resetTrip', async (data) => {
        // data: { busId }
        try {
            const Bus = require('./models/Bus');
            const Route = require('./models/Route');
            const bus = await Bus.findOne({ busNumber: data.busId });
            if (bus) {
                const route = await Route.findOne({ assignedBus: bus._id });
                if (route) {
                    route.stops.forEach(s => s.status = 'pending');
                    route.markModified('stops');
                    await route.save();

                    // Broadcast reset to everyone
                    io.to(`bus_${data.busId}`).emit('tripReset', { busId: data.busId });
                    io.to('admin_room').emit('tripReset', { busId: data.busId });
                    console.log(`[RESET] Bus ${data.busId} trip reset.`);
                }
            }
        } catch (err) {
            console.error('[RESET] Error:', err.message);
        }
    });

    // Driver broadcasts a status/traffic update to all parents on this bus AND Admin
    socket.on('driverStatusUpdate', async (data) => {
        // data: { busId, message, type, driverName } — type: 'info' | 'delay' | 'emergency'
        const broadcastData = {
            ...data,
            readBy: [],
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

        // --- REAL PUSH NOTIFICATION ---
        sendPushToBusParents(
            data.busId,
            `Bus Alert: ${data.driverName}`,
            data.message
        );

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

        // Broadcast to driver (excluding sender if they were in the room, but parents send from private state)
        socket.to(`bus_${data.busId}_driver`).emit('incomingParentMessage', msgPayload);

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

        // Broadcast to all parents tracking this bus (excluding the driver themselves)
        socket.to(`bus_${data.busId}`).emit('incomingParentMessage', msgPayload);

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
        // Only cache and broadcast if coordinates are valid
        if (data.lat && data.lng && (Number(data.lat) !== 0 || Number(data.lng) !== 0)) {
            // Cache this session
            parentSessions[socket.id] = data;

            // Broadcast ONLY to the driver of this bus
            io.to(`bus_${data.busId}_driver`).emit('parentLocationUpdate', data);
            console.log(`[SOCKET] Parent of ${data.studentName} sent location to bus_${data.busId}_driver`);
        }
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


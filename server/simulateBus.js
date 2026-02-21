const io = require('socket.io-client');

const socket = io('http://localhost:5000');

const BUS_ID = '101';

// 📍 CONFIGURATION: 
// Replace these with YOUR actual location from the browser for best results!
// Updated to Visakhapatnam (based on your screenshot)
const TARGET_LAT = 17.819670597532003;
const TARGET_LNG = 83.34613275032673;

// Function to generate a random point within X km radius
const generateStartPoint = (centerLat, centerLng, radiusKm) => {
    const r = radiusKm / 111.32; // Convert km to degrees approx
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.sqrt(Math.random()) * r; // Uniform distribution

    return {
        lat: centerLat + distance * Math.cos(angle),
        lng: centerLng + distance * Math.sin(angle)
    };
};

// Start 5-10km away
const start = generateStartPoint(TARGET_LAT, TARGET_LNG, 10);
let currentLat = start.lat;
let currentLng = start.lng;

// Movement steps (simple linear interpolation for simulation)
const steps = 100; // Total updates to reach destination
const stepLat = (TARGET_LAT - start.lat) / steps;
const stepLng = (TARGET_LNG - start.lng) / steps;

console.log(`🚌 Simulation started for Bus ${BUS_ID}`);
console.log(`🎯 Target (Parent): ${TARGET_LAT}, ${TARGET_LNG}`);
console.log(`🏁 Start Point: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`);

socket.on('connect', () => {
    console.log('Connected! Bus is moving towards parent...');

    // Simulate movement every 2 seconds
    setInterval(() => {
        // Update position
        currentLat += stepLat;
        currentLng += stepLng;

        // Reset if reached (approx)
        if (Math.abs(currentLat - TARGET_LAT) < 0.0001 && Math.abs(currentLng - TARGET_LNG) < 0.0001) {
            console.log('✅ Reached destination. Resetting...');
            const newStart = generateStartPoint(TARGET_LAT, TARGET_LNG, 10);
            currentLat = newStart.lat;
            currentLng = newStart.lng;
        }

        socket.emit('driverLocation', {
            busId: BUS_ID,
            lat: currentLat,
            lng: currentLng,
            speed: 45, // km/h
            heading: 0
        });

        console.log(`📍 Bus at: ${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`);
    }, 2000); // Fast updates
});

socket.on('disconnect', () => {
    console.log('Disconnected');
});

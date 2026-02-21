const mongoose = require('mongoose');
const Route = require('./models/Route');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const routes = await Route.find({});
        console.log(`Found ${routes.length} routes.`);

        routes.forEach(r => {
            console.log(`Route: ${r.name}`);
            r.stops.forEach((s, i) => {
                if (s.location && (s.location.lat || s.location.lng)) {
                    console.log(`  - Stop ${i}: ${s.name} [HAS LOCATION: ${s.location.lat}, ${s.location.lng}]`);
                } else {
                    console.log(`  - Stop ${i}: ${s.name} [No Location]`);
                }
            });
        });

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

connectDB();

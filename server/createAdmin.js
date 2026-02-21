const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User'); // Adjust path if needed
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const createAdmin = async () => {
    try {
        const adminEmail = "admin@kiddotrack.com";
        const password = "admin123";

        // Check if exists
        const userExists = await User.findOne({ email: adminEmail });
        if (userExists) {
            console.log("Admin user already exists!");
            // Update role just in case
            userExists.role = 'admin';
            await userExists.save();
            console.log("Updated role to 'admin'.");
            process.exit();
        }

        // Create new
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = await User.create({
            name: "Admin User",
            email: adminEmail,
            password: hashedPassword,
            role: "admin"
        });

        console.log(`Admin created successfully! Email: ${adminEmail}, Password: ${password}`);
        process.exit();
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

createAdmin();

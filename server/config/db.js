const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Create default admin if not exists
    const adminEmail = "admin@kiddotrack.com";
    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      const password = "admin123";
      await User.create({
        name: "Default Admin",
        email: adminEmail,
        password: password, // Will be hashed by pre-save hook
        role: "admin"
      });
      console.log(`[INIT] Default admin created: ${adminEmail} / ${password}`);
    } else {
      console.log(`[INIT] Admin already exists: ${adminEmail}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

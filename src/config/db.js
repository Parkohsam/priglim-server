const mongoose = require("mongoose");
const dns = require("node:dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
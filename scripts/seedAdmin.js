require("dotenv").config();
const connectDB = require("../src/config/db");
const { getAuth } = require("firebase-admin/auth");
require("../src/config/firebaseAdmin");
const User = require("../src/models/User");

async function seedAdmin(email) {
    await connectDB();

    const firebaseUser = await getAuth().getUserByEmail(email);

    const updatedUser = await User.findOneAndUpdate(
        { firebaseUid: firebaseUser.uid },
        { role: "admin" },
        { returnDocument: "after" }
    );

    if (!updatedUser) {
        console.log("No matching MongoDB user found. Make sure this account has logged in at least once via the app first.");
    } else {
        console.log("Promoted to admin:", updatedUser.email);
    }

    process.exit(0);
}

const emailArg = process.argv[2];

if (!emailArg) {
    console.log("Usage: node scripts/seedAdmin.js your-email@example.com");
    process.exit(1);
}

seedAdmin(emailArg);
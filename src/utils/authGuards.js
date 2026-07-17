const User = require("../models/User");

async function requireAuth(context) {
    if (!context.firebaseUser) {
        throw new Error("Not authenticated");
    }

    const user = await User.findOne({ firebaseUid: context.firebaseUser.uid });
    if (!user) {
        throw new Error("User not found. Please sync your account first.");
    }

    return user;
}

async function requireAdmin(context) {
    const user = await requireAuth(context);
    if (user.role !== "admin") {
        throw new Error("Admin access required");
    }
    return user;
}

module.exports = { requireAuth, requireAdmin };
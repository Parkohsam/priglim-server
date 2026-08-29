const express = require("express");
const { getAuth } = require("firebase-admin/auth");
require("../config/firebaseAdmin");
const { sendPasswordResetEmail } = require("../utils/sendPasswordResetEmail");

const router = express.Router();

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const resetLink = await getAuth().generatePasswordResetLink(email, {
      url: `${process.env.CLIENT_URL}/login`,
    });

    await sendPasswordResetEmail(email, resetLink);

    return res.status(200).json({
      message: "If an account exists with this email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(200).json({
      message: "If an account exists with this email, a reset link has been sent.",
    });
  }
});

module.exports = router;
const { sendViaBrevo } = require("./sendBookingEmails");

function passwordResetHtml(resetLink) {
  return `
  <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1B2333;">
    <div style="background: #16233F; padding: 24px; border-radius: 8px 8px 0 0;">
      <h1 style="color: #ffffff; font-size: 18px; margin: 0;">Reset your password</h1>
    </div>
    <div style="border: 1px solid #E4E7ED; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
      <p>You requested a password reset.</p>
      <p>Click the button below to reset your password:</p>
      <a href="${resetLink}"
         style="display:inline-block;padding:10px 20px;background:#16233F;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
        Reset Password
      </a>
      <p style="font-size: 13px; color: #6B7280; margin-top: 16px;">
        If you did not request this, you can safely ignore this email.
      </p>
    </div>
  </div>
  `;
}

async function sendPasswordResetEmail(email, resetLink) {
  return sendViaBrevo({
    to: email,
    subject: "Reset your password",
    html: passwordResetHtml(resetLink),
  });
}

module.exports = { sendPasswordResetEmail };
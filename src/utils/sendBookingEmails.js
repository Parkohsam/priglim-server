const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Sends a single transactional email through Brevo's API. Centralizing
 * the fetch call here means every email function below stays focused on
 * just building its own HTML, not repeating request boilerplate.
 */
async function sendViaBrevo({ to, subject, html }) {
  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: process.env.BREVO_SENDER_EMAIL, name: "Priglim" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo API error (${response.status}): ${errorBody}`);
  }

  return response.json();
}

function formatNaira(amount) {
  return `₦${amount.toLocaleString()}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function userConfirmationHtml(payload) {
  return `
  <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1B2333;">
    <div style="background: #16233F; padding: 24px; border-radius: 8px 8px 0 0;">
      <h1 style="color: #ffffff; font-size: 18px; margin: 0;">Booking confirmed</h1>
    </div>
    <div style="border: 1px solid #E4E7ED; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
      <p>Hi ${payload.userName},</p>
      <p>Your booking for <strong>${payload.packageTitle}</strong> has been received.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Booking reference</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${payload.bookingId}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Package</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${payload.packageTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Departure</td>
          <td style="padding: 6px 0; text-align: right;">${formatDate(payload.departureDate)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Return</td>
          <td style="padding: 6px 0; text-align: right;">${formatDate(payload.returnDate)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Pilgrims</td>
          <td style="padding: 6px 0; text-align: right;">${payload.numberOfPilgrims}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0 0; color: #6B7280; border-top: 1px solid #E4E7ED;">Total due</td>
          <td style="padding: 10px 0 0; text-align: right; font-weight: 700; border-top: 1px solid #E4E7ED;">
            ${formatNaira(payload.totalAmount)}
          </td>
        </tr>
      </table>

      <p style="font-size: 13px; color: #6B7280;">
        We'll be in touch with payment and next steps shortly. If anything above looks wrong,
        reply to this email and we'll sort it out.
      </p>
    </div>
  </div>
  `;
}

function adminNotificationHtml(payload) {
  const pilgrimRows = payload.pilgrims
    .map(
      (p, i) => `
      <tr>
        <td style="padding: 6px 0; color: #6B7280;">Pilgrim ${i + 1}</td>
        <td style="padding: 6px 0; text-align: right;">${p.name} — ${p.passportNumber}</td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1B2333;">
    <div style="background: #16233F; padding: 24px; border-radius: 8px 8px 0 0;">
      <h1 style="color: #ffffff; font-size: 18px; margin: 0;">New booking received</h1>
    </div>
    <div style="border: 1px solid #E4E7ED; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Booking reference</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${payload.bookingId}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Customer</td>
          <td style="padding: 6px 0; text-align: right;">${payload.userName} (${payload.userEmail})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Package</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${payload.packageTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Pilgrims</td>
          <td style="padding: 6px 0; text-align: right;">${payload.numberOfPilgrims}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0 0; color: #6B7280; border-top: 1px solid #E4E7ED;">Total</td>
          <td style="padding: 10px 0 0; text-align: right; font-weight: 700; border-top: 1px solid #E4E7ED;">
            ${formatNaira(payload.totalAmount)}
          </td>
        </tr>
        ${pilgrimRows}
      </table>
    </div>
  </div>
  `;
}

function paymentConfirmedHtml(payload) {
  return `
  <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1B2333;">
    <div style="background: #1D9A6C; padding: 24px; border-radius: 8px 8px 0 0;">
      <h1 style="color: #ffffff; font-size: 18px; margin: 0;">Payment received</h1>
    </div>
    <div style="border: 1px solid #E4E7ED; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
      <p>Hi ${payload.userName},</p>
      <p>We've received your payment for <strong>${payload.packageTitle}</strong>. Your booking is now confirmed.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Booking reference</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${payload.bookingId}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0 0; color: #6B7280; border-top: 1px solid #E4E7ED;">Amount paid</td>
          <td style="padding: 10px 0 0; text-align: right; font-weight: 700; border-top: 1px solid #E4E7ED;">
            ${formatNaira(payload.totalAmount)}
          </td>
        </tr>
      </table>

      <p style="font-size: 13px; color: #6B7280;">
        We'll be in touch with further details ahead of departure. Reply to this email if you have any questions.
      </p>
    </div>
  </div>
  `;
}

function welcomeEmailHtml(payload) {
  const packagesUrl = `${process.env.CLIENT_URL}/packages`;
  return `
  <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1B2333;">
    <div style="background: #16233F; padding: 24px; border-radius: 8px 8px 0 0;">
      <h1 style="color: #ffffff; font-size: 18px; margin: 0;">Welcome, ${payload.userName}</h1>
    </div>
    <div style="border: 1px solid #E4E7ED; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
      <p>Thanks for creating an account. You're ready to start planning your journey.</p>
      <a href="${packagesUrl}"
         style="display: inline-block; margin-top: 12px; background: #16233F; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">
        Browse Hajj & Umrah packages
      </a>
      <p style="font-size: 13px; color: #6B7280; margin-top: 24px;">
        If you have any questions along the way, just reply to this email.
      </p>
    </div>
  </div>
  `;
}

/**
 * Fires both booking emails. Failures are logged, not thrown — a broken
 * email send should never fail or roll back the booking itself. Call
 * this AFTER the booking is successfully saved.
 */
async function sendBookingEmails(payload) {
  const results = await Promise.allSettled([
    sendViaBrevo({
      to: payload.userEmail,
      subject: `Booking confirmed — ${payload.packageTitle}`,
      html: userConfirmationHtml(payload),
    }),
    sendViaBrevo({
      to: process.env.ADMIN_EMAIL,
      subject: `New booking — ${payload.packageTitle} (${payload.numberOfPilgrims} pilgrim${payload.numberOfPilgrims === 1 ? "" : "s"})`,
      html: adminNotificationHtml(payload),
    }),
  ]);

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const recipient = i === 0 ? "user" : "admin";
      console.error(`Failed to send booking email to ${recipient}:`, result.reason);
    }
  });
}

/**
 * Fires the payment-confirmation email to the user only. Call this from
 * the Paystack webhook, after paymentStatus is set to "paid".
 */
async function sendPaymentConfirmedEmail(payload) {
  try {
    await sendViaBrevo({
      to: payload.userEmail,
      subject: `Payment received — ${payload.packageTitle}`,
      html: paymentConfirmedHtml(payload),
    });
  } catch (err) {
    console.error("Failed to send payment confirmation email:", err);
  }
}

/**
 * Fires a welcome email once, right after a genuinely new user is
 * created (not on every syncUser call — see the resolver, which only
 * calls this in the User.create branch).
 */
async function sendWelcomeEmail(payload) {
  try {
    await sendViaBrevo({
      to: payload.userEmail,
      subject: "Welcome — let's plan your journey",
      html: welcomeEmailHtml(payload),
    });
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }
}


function bankTransferSubmittedHtml(payload) {
  return `
  <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1B2333;">
    <div style="background: #F0A202; padding: 24px; border-radius: 8px 8px 0 0;">
      <h1 style="color: #16233F; font-size: 18px; margin: 0;">Bank transfer proof submitted</h1>
    </div>
    <div style="border: 1px solid #E4E7ED; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Booking reference</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${payload.bookingId}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Customer</td>
          <td style="padding: 6px 0; text-align: right;">${payload.userName} (${payload.userEmail})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Package</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${payload.packageTitle}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0 0; color: #6B7280; border-top: 1px solid #E4E7ED;">Amount</td>
          <td style="padding: 10px 0 0; text-align: right; font-weight: 700; border-top: 1px solid #E4E7ED;">
            ${formatNaira(payload.totalAmount)}
          </td>
        </tr>
      </table>
      <p style="margin-top: 16px;">
        <a href="${payload.receiptUrl}" style="color: #16233F; font-weight: 600;">View uploaded receipt</a>
      </p>
      <p style="font-size: 13px; color: #6B7280; margin-top: 16px;">
        Please review and approve or reject this in the admin Payments page.
      </p>
    </div>
  </div>
  `;
}

function bankTransferRejectedHtml(payload) {
  return `
  <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1B2333;">
    <div style="background: #D64545; padding: 24px; border-radius: 8px 8px 0 0;">
      <h1 style="color: #ffffff; font-size: 18px; margin: 0;">We couldn't verify your payment</h1>
    </div>
    <div style="border: 1px solid #E4E7ED; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
      <p>Hi ${payload.userName},</p>
      <p>We weren't able to confirm your bank transfer for <strong>${payload.packageTitle}</strong>.</p>
      ${payload.reason ? `<p style="background: #FEF2F2; padding: 12px; border-radius: 6px; font-size: 14px; color: #6B7280;">Note from our team: ${payload.reason}</p>` : ""}
      <p style="font-size: 13px; color: #6B7280; margin-top: 16px;">
        Please return to your booking to try again, either with a clearer receipt or a different payment method.
      </p>
    </div>
  </div>
  `;
}

/**
 * Notifies the admin that a customer submitted bank transfer proof and
 * is waiting for manual review. Call this from submitBankTransferProof.
 */
async function sendBankTransferSubmittedEmail(payload) {
  try {
    await sendViaBrevo({
      to: process.env.ADMIN_EMAIL,
      subject: `Bank transfer proof submitted — ${payload.packageTitle}`,
      html: bankTransferSubmittedHtml(payload),
    });
  } catch (err) {
    console.error("Failed to send bank transfer submitted email:", err);
  }
}

/**
 * Notifies the user their bank transfer proof was rejected. Call this
 * from rejectBankTransferPayment.
 */
async function sendBankTransferRejectedEmail(payload) {
  try {
    await sendViaBrevo({
      to: payload.userEmail,
      subject: `Update on your payment — ${payload.packageTitle}`,
      html: bankTransferRejectedHtml(payload),
    });
  } catch (err) {
    console.error("Failed to send bank transfer rejected email:", err);
  }
}

module.exports = {
  sendBookingEmails,
  sendPaymentConfirmedEmail,
  sendWelcomeEmail,
  sendBankTransferSubmittedEmail,
  sendBankTransferRejectedEmail,
};
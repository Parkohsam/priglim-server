const express = require("express");
const Booking = require("../models/Booking");
const { verifyWebhookSignature } = require("../services/paystack.service");
const { sendPaymentConfirmedEmail } = require("../utils/sendBookingEmails");

const router = express.Router();

// IMPORTANT: this route needs the RAW, unparsed request body to verify
// Paystack's signature correctly. express.raw() below handles that —
// do not apply express.json() globally in a way that runs before this
// route, or the signature check will always fail.
router.post(
  "/paystack",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["x-paystack-signature"];

    if (!signature || !verifyWebhookSignature(req.body, signature)) {
      console.error("Paystack webhook: invalid signature, rejecting.");
      return res.status(401).send("Invalid signature");
    }

    // Body is a raw Buffer at this point (that's what express.raw gives
    // us) — safe to parse now that the signature is confirmed genuine.
    const event = JSON.parse(req.body.toString());

    // Acknowledge receipt immediately. Paystack retries webhooks that
    // don't get a fast 200 response, so we respond first and do the
    // actual work after — this endpoint should never make Paystack wait.
    res.status(200).send("Received");

    if (event.event !== "charge.success") {
      return;
    }

    try {
      const { reference, metadata } = event.data;
      const bookingId = metadata?.bookingId;

      if (!bookingId) {
        console.error("Paystack webhook: charge.success with no bookingId in metadata", reference);
        return;
      }

      const booking = await Booking.findById(bookingId).populate("package").populate("user");

      if (!booking) {
        console.error("Paystack webhook: booking not found for id", bookingId);
        return;
      }

      // Avoid double-processing if Paystack ever retries the same
      // webhook (their docs explicitly warn this can happen).
      if (booking.paymentStatus === "paid") {
        return;
      }

      booking.paymentStatus = "paid";
      booking.status = "confirmed";
      await booking.save();

      await sendPaymentConfirmedEmail({
        bookingId: booking._id.toString(),
        userEmail: booking.user.email,
        userName: booking.user.firstName
          ? `${booking.user.firstName} ${booking.user.lastName || ""}`.trim()
          : booking.user.name || "there",
        packageTitle: booking.package.title,
        totalAmount: booking.totalAmount,
      });
    } catch (err) {
      // The webhook already got its 200 response above, so an error here
      // just needs logging for you to investigate — it can't be retried
      // automatically by Paystack since they already got acknowledged.
      console.error("Error processing Paystack webhook:", err);
    }
  }
);

module.exports = router;
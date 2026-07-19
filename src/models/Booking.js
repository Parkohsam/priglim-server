const mongoose = require("mongoose");

const pilgrimSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    passportNumber: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package", required: true },

    numberOfPilgrims: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },
    pilgrimDetails: [pilgrimSchema],

    totalAmount: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending_payment", "paid_pending_review", "confirmed", "cancelled"],
      default: "pending_payment",
    },

    visaStatus: {
      type: String,
      enum: ["not_started", "in_review", "approved", "rejected"],
      default: "not_started",
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },

    refundStatus: {
      type: String,
      enum: ["not_applicable", "pending", "processed", "failed"],
      default: "not_applicable",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
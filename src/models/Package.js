const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ["hajj", "umrah", "ramadan_umrah"], required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: String, required: true },

    bookingOpenDate: { type: Date, required: true },
    bookingCloseDate: { type: Date, required: true },
    departureDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },

    availabilityStatus: {
      type: String,
      enum: ["draft", "open", "paused", "closed"],
      default: "draft",
    },

    images: [{ type: String }],
    itinerary: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Package", packageSchema);
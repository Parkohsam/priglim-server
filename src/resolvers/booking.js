const Booking = require("../models/Booking");
const Package = require("../models/Package");
const { requireAuth, requireAdmin } = require("../utils/authGuards");

const resolvers = {
  Query: {
    myBookings: async (_parent, _args, context) => {
      const user = await requireAuth(context);
      return Booking.find({ user: user._id }).sort({ createdAt: -1 });
    },

    allBookings: async (_parent, _args, context) => {
      await requireAdmin(context);
      return Booking.find().populate("package").populate("user").sort({ createdAt: -1 });
    },
  },

  Mutation: {
    createBooking: async (_parent, { input }, context) => {
      const user = await requireAuth(context);
      const { packageId, numberOfPilgrims, pilgrimDetails } = input;

      const pkg = await Package.findById(packageId);
      if (!pkg) {
        throw new Error("Package not found");
      }

      if (pkg.availabilityStatus !== "open") {
        throw new Error("This package is not currently open for booking");
      }

      const now = new Date();
      if (now < pkg.bookingOpenDate || now > pkg.bookingCloseDate) {
        throw new Error("This package is outside its booking window");
      }

      if (pilgrimDetails.length !== numberOfPilgrims) {
        throw new Error(
          `numberOfPilgrims (${numberOfPilgrims}) does not match the number of pilgrim details provided (${pilgrimDetails.length})`
        );
      }

      const totalAmount = pkg.price * numberOfPilgrims;

      const booking = await Booking.create({
        user: user._id,
        package: pkg._id,
        numberOfPilgrims,
        pilgrimDetails,
        totalAmount,
        status: "pending_payment",
        paymentStatus: "unpaid",
      });

      return booking.populate("package");
    },
  },

  Booking: {
    createdAt: (parent) => parent.createdAt.toISOString(),
    pilgrimDetails: (parent) =>
      parent.pilgrimDetails.map((p) => ({
        ...p.toObject(),
        dateOfBirth: p.dateOfBirth.toISOString(),
      })),
  },
};

module.exports = resolvers;
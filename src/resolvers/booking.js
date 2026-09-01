const Booking = require("../models/Booking");
const Package = require("../models/Package");
const { requireAuth, requireAdmin, requireRecentAuth } = require("../utils/authGuards");
const {
  sendBookingEmails,
  sendPaymentConfirmedEmail,
  sendBankTransferSubmittedEmail,
  sendBankTransferRejectedEmail,
} = require("../utils/sendBookingEmails");
const { initializeTransaction } = require("../services/paystack.service");

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

      // Server-side validation — never trust the frontend alone for this,
      // since these fields determine what documents actually get filed
      // for immigration/visa purposes.
      const PHONE_PATTERN = /^\d{11}$/;
      pilgrimDetails.forEach((p, i) => {
        if (!PHONE_PATTERN.test(p.phoneNumber)) {
          throw new Error(
            `Pilgrim ${i + 1}: phone number must be exactly 11 digits.`
          );
        }

        if (p.hasPassport) {
          if (!p.passportImageUrl) {
            throw new Error(
              `Pilgrim ${i + 1}: passport image is required for pilgrims with a passport.`
            );
          }
        } else {
          if (!p.ninImageUrl || !p.stateOfOriginImageUrl || !p.declarationOfAgeImageUrl) {
            throw new Error(
              `Pilgrim ${i + 1}: NIN, state of origin certificate, and declaration of age images are all required for pilgrims without a passport.`
            );
          }
        }
      });

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

      sendBookingEmails({
        bookingId: booking._id.toString(),
        userEmail: user.email,
        userName: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : (user.fullName || user.name || "there"),
        packageTitle: pkg.title,
        packageType: pkg.type,
        departureDate: pkg.departureDate,
        returnDate: pkg.returnDate,
        numberOfPilgrims,
        totalAmount,
        pilgrims: pilgrimDetails,
      }).catch((err) => {
        console.error("Unexpected error sending booking emails:", err);
      });

      return booking.populate("package");
    },

    initializePayment: async (_parent, { bookingId }, context) => {
      const user = await requireRecentAuth(context);

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.user.toString() !== user._id.toString()) {
        throw new Error("You are not authorized to pay for this booking");
      }

      if (booking.paymentStatus === "paid") {
        throw new Error("This booking has already been paid for");
      }

      const { authorizationUrl, reference } = await initializeTransaction({
        email: user.email,
        amountInNaira: booking.totalAmount,
        metadata: { bookingId: booking._id.toString() },
        callbackUrl: `${process.env.CLIENT_URL}/bookings/${booking._id}`,
      });

      return { authorizationUrl, reference };
    },

    submitBankTransferProof: async (_parent, { bookingId, receiptUrl }, context) => {
      const user = await requireAuth(context);

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.user.toString() !== user._id.toString()) {
        throw new Error("You are not authorized to update this booking");
      }

      if (booking.paymentStatus === "paid") {
        throw new Error("This booking has already been paid for");
      }

      booking.paymentMethod = "bank_transfer";
      booking.receiptUrl = receiptUrl;
      booking.status = "paid_pending_review";
      await booking.save();

      const pkg = await Package.findById(booking.package);

      sendBankTransferSubmittedEmail({
        bookingId: booking._id.toString(),
        userEmail: user.email,
        userName: user.fullName || user.name || "there",
        packageTitle: pkg ? pkg.title : "Unknown package",
        totalAmount: booking.totalAmount,
        receiptUrl,
      }).catch((err) => {
        console.error("Unexpected error sending bank transfer submitted email:", err);
      });

      return booking.populate("package");
    },

    approveBankTransferPayment: async (_parent, { bookingId }, context) => {
      await requireAdmin(context);

      const booking = await Booking.findById(bookingId).populate("package").populate("user");
      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.paymentStatus === "paid") {
        throw new Error("This booking has already been marked as paid");
      }

      booking.paymentStatus = "paid";
      booking.status = "confirmed";
      await booking.save();

      if (booking.user) {
        sendPaymentConfirmedEmail({
          bookingId: booking._id.toString(),
          userEmail: booking.user.email,
          userName: booking.user.fullName || booking.user.name || "there",
          packageTitle: booking.package ? booking.package.title : "Unknown package",
          totalAmount: booking.totalAmount,
        }).catch((err) => {
          console.error("Unexpected error sending payment confirmed email:", err);
        });
      }

      return booking;
    },

    rejectBankTransferPayment: async (_parent, { bookingId, reason }, context) => {
      await requireAdmin(context);

      const booking = await Booking.findById(bookingId).populate("package").populate("user");
      if (!booking) {
        throw new Error("Booking not found");
      }

      booking.status = "pending_payment";
      booking.paymentMethod = undefined;
      booking.receiptUrl = undefined;
      booking.reviewNote = reason || "";
      await booking.save();

      if (booking.user) {
        sendBankTransferRejectedEmail({
          userEmail: booking.user.email,
          userName: booking.user.fullName || booking.user.name || "there",
          packageTitle: booking.package ? booking.package.title : "Unknown package",
          reason: reason || "",
        }).catch((err) => {
          console.error("Unexpected error sending rejection email:", err);
        });
      }

      return booking;
    },
  },

  Booking: {
    createdAt: (parent) => parent.createdAt.toISOString(),
  },
};

module.exports = resolvers;
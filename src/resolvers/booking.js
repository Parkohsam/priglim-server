const Booking = require("../models/Booking");
const Package = require("../models/Package");
const { requireAuth, requireAdmin, requireRecentAuth } = require("../utils/authGuards");
const { sendBookingEmails, sendPaymentConfirmedEmail, sendBankTransferSubmittedEmail, sendBankTransferRejectedEmail } = require("../utils/sendBookingEmails");
const { GraphQLError } = require("graphql");

const ALLOWED_CLOUDINARY_HOST = "res.cloudinary.com";
const ALLOWED_CLOUDINARY_PREFIX = "/dlcq2g3cu/";

function validateReceiptUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new GraphQLError("Invalid receipt URL", { extensions: { code: "BAD_USER_INPUT" } });
  }
  if (parsed.protocol !== "https:") {
    throw new GraphQLError("Receipt URL must use https", { extensions: { code: "BAD_USER_INPUT" } });
  }
  if (parsed.hostname !== ALLOWED_CLOUDINARY_HOST || !parsed.pathname.startsWith(ALLOWED_CLOUDINARY_PREFIX)) {
    throw new GraphQLError("Receipt must be a Cloudinary image from the configured account", { extensions: { code: "BAD_USER_INPUT" } });
  }
  if (parsed.pathname.match(/\.(svg|html|htm)(\?|$)/i)) {
    throw new GraphQLError("Receipt must be an image (svg/html not allowed)", { extensions: { code: "BAD_USER_INPUT" } });
  }
}

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

      if (numberOfPilgrims < 1 || numberOfPilgrims > 20) {
        throw new GraphQLError("numberOfPilgrims must be between 1 and 20", { extensions: { code: "BAD_USER_INPUT" } });
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
        userName: user.fullName || user.name || "there",
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

    submitBankTransferProof: async (_parent, { bookingId, receiptUrl }, context) => {
      const user = await requireRecentAuth(context);

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
      if (booking.status === "cancelled") {
        throw new Error("This booking has been cancelled and cannot be paid for");
      }
      if (booking.status === "paid_pending_review") {
        throw new Error("This booking is already awaiting review");
      }
      if (booking.status === "confirmed") {
        throw new Error("This booking is already confirmed");
      }

      validateReceiptUrl(receiptUrl);

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
      if (booking.status !== "paid_pending_review") {
        throw new Error("Only bookings awaiting review can be approved");
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
      if (booking.paymentStatus === "paid") {
        throw new Error("Cannot reject a booking that is already marked as paid");
      }
      if (booking.status !== "paid_pending_review") {
        throw new Error("Only bookings awaiting review can be rejected");
      }

      booking.status = "pending_payment";
      booking.paymentStatus = "unpaid";
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
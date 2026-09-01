const Package = require("../models/Package");
const Booking = require("../models/Booking");
const { requireAdmin } = require("../utils/authGuards");

const resolvers = {
  Query: {
    packages: async () => {
      return Package.find().sort({ createdAt: -1 });
    },
    package: async (_parent, { id }) => {
      return Package.findById(id);
    },
  },
  Package: {
    bookingOpenDate: (parent) => parent.bookingOpenDate.toISOString(),
    bookingCloseDate: (parent) => parent.bookingCloseDate.toISOString(),
    departureDate: (parent) => parent.departureDate.toISOString(),
    returnDate: (parent) => parent.returnDate.toISOString(),
  },
  Mutation: {
    createPackage: async (_parent, { input }, context) => {
      await requireAdmin(context);
      validatePackageInput(input);
      return Package.create(input);
    },

    updatePackage: async (_parent, { id, input }, context) => {
      await requireAdmin(context);
      validatePackageInput(input);
      const updated = await Package.findByIdAndUpdate(id, input, { new: true, runValidators: true });
      if (!updated) throw new Error("Package not found");
      return updated;
    },

    setPackageAvailability: async (_parent, { id, availabilityStatus }, context) => {
      await requireAdmin(context);
      const valid = ["draft", "open", "paused", "closed"];
      if (!valid.includes(availabilityStatus)) {
        throw new Error(`Invalid status. Must be one of: ${valid.join(", ")}`);
      }
      const updated = await Package.findByIdAndUpdate(
        id,
        { availabilityStatus },
        { new: true }
      );
      if (!updated) throw new Error("Package not found");
      return updated;
    },

    deletePackage: async (_parent, { id }, context) => {
      await requireAdmin(context);

      // SAFETY: never allow deleting a package that bookings still
      // reference — doing so leaves those bookings pointing at nothing,
      // which breaks anything that expects booking.package to exist
      // (like the admin bookings list, which crashed entirely from
      // exactly this). Closing the package is the safe way to retire
      // it without corrupting existing booking records.
      const bookingCount = await Booking.countDocuments({ package: id });
      if (bookingCount > 0) {
        throw new Error(
          `Cannot delete this package — ${bookingCount} booking(s) still reference it. ` +
          `Use "Close" (setPackageAvailability) instead to stop new bookings while preserving booking history.`
        );
      }

      const deleted = await Package.findByIdAndDelete(id);
      return !!deleted;
    },
  },
};

function validatePackageInput(input) {
  const { GraphQLError } = require("graphql");
  if (input.price != null && (typeof input.price !== "number" || input.price <= 0)) {
    throw new GraphQLError("Price must be a positive number", { extensions: { code: "BAD_USER_INPUT" } });
  }
  const dates = ["bookingOpenDate", "bookingCloseDate", "departureDate", "returnDate"];
  for (const key of dates) {
    if (input[key] && isNaN(Date.parse(input[key]))) {
      throw new GraphQLError(`Invalid date for ${key}`, { extensions: { code: "BAD_USER_INPUT" } });
    }
  }
  if (input.bookingOpenDate && input.bookingCloseDate && input.departureDate && input.returnDate) {
    const open = new Date(input.bookingOpenDate);
    const close = new Date(input.bookingCloseDate);
    const dep = new Date(input.departureDate);
    const ret = new Date(input.returnDate);
    if (!(open < close && close < dep && dep < ret)) {
      throw new GraphQLError("Dates must satisfy: bookingOpenDate < bookingCloseDate < departureDate < returnDate", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
  }
}

module.exports = resolvers;
const Package = require("../models/Package");
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
      return Package.create(input);
    },

    updatePackage: async (_parent, { id, input }, context) => {
      await requireAdmin(context);
      const updated = await Package.findByIdAndUpdate(id, input, { new: true });
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
      const deleted = await Package.findByIdAndDelete(id);
      return !!deleted;
    },
  },
};

module.exports = resolvers;
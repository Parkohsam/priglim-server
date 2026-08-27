const User = require("../models/User");
const { sendWelcomeEmail } = require("../utils/sendBookingEmails");
const { requireAdmin } = require("../utils/authGuards");

const resolvers = {
  Query: {
    me: async (_parent, _args, context) => {
      if (!context.firebaseUser) return null;
      return User.findOne({ firebaseUid: context.firebaseUser.uid });
    },

    users: async (_parent, _args, context) => {
      await requireAdmin(context);
      return User.find().sort({ createdAt: -1 });
    },
  },

  User: {
    createdAt: (parent) => parent.createdAt.toISOString(),
  },

  Mutation: {
    syncUser: async (_parent, { fullName, phone }, context) => {
      if (!context.firebaseUser) {
        throw new Error("Not authenticated");
      }
      const { uid, email } = context.firebaseUser;

      let user = await User.findOne({ firebaseUid: uid });

      if (!user) {
        const existingByEmail = await User.findOne({ email });

        if (existingByEmail) {
          // SECURITY: never auto-link a privileged account just because
          // the email matches. Without this check, anyone who registers
          // with that same email address would inherit whatever role
          // that record has — including admin — with zero verification
          // that they're actually the intended owner. Admin accounts
          // must be linked manually by someone who has confirmed the
          // person's identity out of band (e.g. directly in the DB,
          // after actually confirming it's really them).
          if (existingByEmail.role === "admin") {
            throw new Error(
              "This email is associated with a restricted account. Please contact support to link it."
            );
          }

          existingByEmail.firebaseUid = uid;
          existingByEmail.fullName = fullName;
          existingByEmail.phone = phone;
          user = await existingByEmail.save();
        } else {
          user = await User.create({
            firebaseUid: uid,
            email,
            fullName,
            phone,
            role: "user",
          });

          sendWelcomeEmail({
            userEmail: user.email,
            userName: user.fullName,
          }).catch((err) => {
            console.error("Unexpected error sending welcome email:", err);
          });
        }
      } else {
        user.fullName = fullName;
        user.phone = phone;
        user = await user.save();
      }

      return user;
    },
  },
};

module.exports = resolvers;
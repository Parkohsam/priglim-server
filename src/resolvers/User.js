const User = require("../models/User");

const resolvers = {
  Query: {
    me: async (_parent, _args, context) => {
      if (!context.firebaseUser) return null;
      return User.findOne({ firebaseUid: context.firebaseUser.uid });
    },
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
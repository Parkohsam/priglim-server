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

            const user = await User.findOneAndUpdate(
                { firebaseUid: uid },
                { $setOnInsert: { firebaseUid: uid, email, role: "user" }, $set: { fullName, phone } },
                { new: true, upsert: true }
            );

            return user;
        },
    },
};

module.exports = resolvers;
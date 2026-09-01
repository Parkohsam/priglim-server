require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createYoga, createSchema } = require("graphql-yoga");
const { getAuth } = require("firebase-admin/auth");

const packageTypeDefs = require("./schema/Package");
const packageResolvers = require("./resolvers/Package");
const bookingTypeDefs = require("./schema/booking");
const bookingResolvers = require("./resolvers/booking");
const connectDB = require("./config/db");
require("./config/firebaseAdmin");

const userTypeDefs = require("./schema/User");
const userResolvers = require("./resolvers/User");

const paystackWebhook = require("./webhooks/paystack.webhook");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// Must stay before any global express.json() call.
// Paystack verifies the raw request bytes.
app.use("/webhooks", paystackWebhook);

// JSON parsing only for auth routes
app.use("/api/auth", express.json(), authRoutes);

const yoga = createYoga({
  schema: createSchema({
    typeDefs: [userTypeDefs, packageTypeDefs, bookingTypeDefs],
    resolvers: [userResolvers, packageResolvers, bookingResolvers],
  }),
  context: async ({ request }) => {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return { firebaseUser: null };
    }

    try {
      const decoded = await getAuth().verifyIdToken(token);
      return { firebaseUser: decoded };
    } catch (err) {
      console.error("Token verification FAILED:", err.message);
      return { firebaseUser: null };
    }
  },
  graphqlEndpoint: "/graphql",
});

app.use("/graphql", yoga);

app.get("/", (req, res) => res.send("Priglim API is running"));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

module.exports = app;
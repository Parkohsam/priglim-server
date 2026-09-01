require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const depthLimit = require("graphql-depth-limit");
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

const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(helmet());

const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:3000", "http://127.0.0.1:3000"].filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { message: "Too many requests, please try again later." } });
const graphqlLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

app.use("/api/auth", authLimiter, express.json(), authRoutes);

const yoga = createYoga({
  schema: createSchema({
    typeDefs: [userTypeDefs, packageTypeDefs, bookingTypeDefs],
    resolvers: [userResolvers, packageResolvers, bookingResolvers],
    validators: [depthLimit(6)],
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
  graphiql: process.env.NODE_ENV !== "production",
  landingPage: false,
});

app.use("/graphql", graphqlLimiter, yoga);

app.get("/", (req, res) => res.send("Priglim API is running"));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

module.exports = app;
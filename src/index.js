const dns = require("node:dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

// server/src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createYoga, createSchema } = require("graphql-yoga");
const { getAuth } = require("firebase-admin/auth");
require("./config/firebaseAdmin");

const connectDB = require("./config/db");

const userTypeDefs = require("./schema/user");
const userResolvers = require("./resolvers/user");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

const yoga = createYoga({
  schema: createSchema({
    typeDefs: [userTypeDefs],
    resolvers: [userResolvers],
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
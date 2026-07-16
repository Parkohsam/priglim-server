const dns = require("node:dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createYoga, createSchema } = require("graphql-yoga");

const connectDB = require("./config/db");
const verifyFirebaseToken = require("./middleware/verifyFirebaseToken");

const userTypeDefs = require("./schema/user");
const userResolvers = require("./resolvers/user");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

const yoga = createYoga({
  schema: createSchema({
    typeDefs: [userTypeDefs],
    resolvers: [userResolvers],
  }),
  context: (initialContext) => {
    return { firebaseUser: initialContext.firebaseUser || null };
  },
  graphqlEndpoint: "/graphql",
});

app.use("/graphql", verifyFirebaseToken, (req, res) => {
  return yoga(req, res, { firebaseUser: req.firebaseUser });
});

app.get("/", (req, res) => res.send("Priglim API is running"));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

module.exports = app;
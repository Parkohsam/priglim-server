const admin = require("../config/firebaseAdmin");

async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    req.firebaseUser = null;
    return next(); // let resolvers decide what's public vs protected
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded; // { uid, email, ... }
  } catch (err) {
    req.firebaseUser = null;
  }

  next();
}

module.exports = verifyFirebaseToken;
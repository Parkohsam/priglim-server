const admin = require("firebase-admin");

const serviceAccount = {
  projectId: process.env.project_id,
  clientEmail: process.env.FIREBASE_client_email,
  privateKey: process.env.private_key.replace(/\\n/g, "\n"),
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
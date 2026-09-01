const { initializeApp, cert } = require("firebase-admin/app");

const serviceAccount = {
  projectId: process.env.project_id,
  clientEmail: process.env.client_email,
  privateKey: process.env.private_key.replace(/\\n/g, "\n"),
};

initializeApp({
  credential: cert(serviceAccount),
});

module.exports = require("firebase-admin");
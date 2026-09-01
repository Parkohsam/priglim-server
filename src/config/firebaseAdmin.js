const { initializeApp, cert } = require("firebase-admin/app");
const fs = require("fs");
const path = require("path");

let credential;

const hasEnvCreds =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

const isPlaceholder =
  hasEnvCreds &&
  (process.env.FIREBASE_PRIVATE_KEY.includes("REPLACE_WITH_REAL") ||
    process.env.FIREBASE_PROJECT_ID.includes("replace-with"));

if (isPlaceholder && process.env.NODE_ENV !== "production") {
  console.warn("Firebase Admin using placeholder credentials — auth verification will fail; set real FIREBASE_* vars for full functionality");
  // Create a syntactically valid dummy credential so the app can still boot in dev
  // Generate a throwaway keypair at startup
  try {
    const { generateKeyPairSync } = require("crypto");
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const dummyKey = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    credential = cert({
      projectId: process.env.FIREBASE_PROJECT_ID || "dummy-project",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "dummy@dummy.iam.gserviceaccount.com",
      privateKey: dummyKey,
    });
  } catch (e) {
    throw new Error("Failed to create dummy Firebase credential: " + e.message);
  }
} else if (hasEnvCreds) {
  credential = cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  });
} else {
  // Local dev fallback: load from gitignored JSON file if present
  const keyPath = path.join(__dirname, "serviceAccountKey.json");
  if (fs.existsSync(keyPath)) {
    // eslint-disable-next-line import/no-dynamic-require
    const serviceAccount = require(keyPath);
    credential = cert(serviceAccount);
    console.warn("Using serviceAccountKey.json — prefer FIREBASE_* env vars in production");
  } else {
    throw new Error(
      "Firebase Admin credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (or provide serviceAccountKey.json for local dev)."
    );
  }
}

initializeApp({ credential });

module.exports = require("firebase-admin");
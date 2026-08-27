const crypto = require("crypto");

const PAYSTACK_BASE_URL = "https://api.paystack.co";

/**
 * Starts a Paystack transaction and returns the hosted payment page
 * URL to redirect the user to. Amount must be in kobo (Naira * 100) —
 * Paystack works in the smallest currency unit, same idea as cents.
 */
async function initializeTransaction({ email, amountInNaira, metadata, callbackUrl }) {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: Math.round(amountInNaira * 100),
      metadata,
      callback_url: callbackUrl,
    }),
  });

  const data = await response.json();

  if (!data.status) {
    throw new Error(data.message || "Failed to initialize Paystack transaction");
  }

  return {
    authorizationUrl: data.data.authorization_url,
    reference: data.data.reference,
  };
}

/**
 * Verifies that a webhook payload genuinely came from Paystack.
 * Paystack signs the raw request body with your secret key (HMAC
 * SHA512) and sends it in the x-paystack-signature header. If this
 * doesn't match, the request did not come from Paystack — reject it.
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  return hash === signatureHeader;
}

module.exports = { initializeTransaction, verifyWebhookSignature };
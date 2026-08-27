const User = require("../models/User");
const { GraphQLError } = require("graphql");

async function requireAuth(context) {
    if (!context.firebaseUser?.uid) {
        throw new GraphQLError("Not authenticated", {
            extensions: { code: "UNAUTHENTICATED" },
        });
    }

    const user = await User.findOne({ firebaseUid: context.firebaseUser.uid });
    if (!user) {
        throw new GraphQLError(
            "User not found. Please sync your account first.",
            { extensions: { code: "USER_NOT_SYNCED" } }
        );
    }

    return user;
}

async function requireAdmin(context) {
    const user = await requireAuth(context);
    if (user.role !== "admin") {
        throw new GraphQLError("Admin access required", {
            extensions: { code: "FORBIDDEN" },
        });
    }
    return user;
}

// How recently the user must have actually logged in (not just had their
// token silently refreshed) to perform a sensitive action like payment.
// 1 hour matches typical "step-up auth" windows used by e-commerce/payment
// flows — long enough not to be annoying during normal checkout, short
// enough that a stale, long-lived session can't authorize new spending.
const MAX_PAYMENT_AUTH_AGE_SECONDS = 60 * 60;

/**
 * Use before any action where a long-lived, silently-refreshed session
 * shouldn't be enough on its own — currently: initiating payment.
 *
 * context.firebaseUser.auth_time is a standard Firebase token claim: the
 * Unix timestamp (seconds) of when the user actually last authenticated
 * (entered a password, completed a Google popup, etc). It does NOT change
 * on every silent token refresh, so this genuinely reflects session age,
 * not token age.
 */
async function requireRecentAuth(context) {
    const user = await requireAuth(context);

    const authTime = context.firebaseUser.auth_time;
    const nowInSeconds = Math.floor(Date.now() / 1000);

    if (!authTime || nowInSeconds - authTime > MAX_PAYMENT_AUTH_AGE_SECONDS) {
        throw new GraphQLError(
            "For your security, please log in again before completing payment.",
            { extensions: { code: "REAUTH_REQUIRED" } }
        );
    }

    return user;
}

module.exports = { requireAuth, requireAdmin, requireRecentAuth };
// ─── Password Reset Tokens ────────────────────────────────────────────────────
//
// The plaintext token only ever exists in the emailed link. We store a SHA-256
// hash, so read access to the users table can't be turned into account takeover.

import { createHash, randomBytes } from "crypto";

/** How long a reset link stays valid. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Minimum gap between reset emails for the same account (anti mailbox-bombing). */
export const RESET_RESEND_COOLDOWN_MS = 2 * 60 * 1000;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token) };
}

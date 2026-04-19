import sql from "@/app/api/utils/sql";
import crypto from "crypto";

/**
 * Token system - HARDENED
 * CRITICAL: All tokens are:
 * - Hashed in database (never stored raw)
 * - Single-use (tracked with used_at)
 * - Time-limited (expires_at enforced)
 * - Type-validated on every use
 */

/**
 * Generate a secure token
 * Stores hash in DB, returns raw token to user
 */
export async function generateToken(type, relatedId, expiryDays = 7, metadata = {}) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  // Ensure table exists
  await sql`
    CREATE TABLE IF NOT EXISTS token_registry (
      id SERIAL PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      related_id INTEGER,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    INSERT INTO token_registry (token_hash, type, related_id, expires_at, metadata)
    VALUES (${tokenHash}, ${type}, ${relatedId}, ${expiresAt}, ${JSON.stringify(metadata)})
  `;

  return rawToken; // Return unhashed token to user
}

/**
 * Validate token
 * STRICT: Check hash, type, expiry, single-use
 */
export async function validateToken(rawToken, expectedType) {
  if (!rawToken) {
    throw new Error("Token required");
  }

  // Hash the incoming token
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const result = await sql`
    SELECT id, type, related_id, used_at, expires_at, metadata
    FROM token_registry
    WHERE token_hash = ${tokenHash}
  `;

  if (!result[0]) {
    throw new Error("Invalid token");
  }

  const record = result[0];

  // 1. Check type match - STRICT
  if (record.type !== expectedType) {
    throw new Error(`Token type mismatch. Expected ${expectedType}, got ${record.type}`);
  }

  // 2. Check expiry - STRICT
  const now = new Date();
  if (new Date(record.expires_at) < now) {
    throw new Error("Token expired");
  }

  // 3. Check single-use - STRICT
  if (record.used_at) {
    throw new Error("Token already used");
  }

  return {
    id: record.id,
    type: record.type,
    relatedId: record.related_id,
    metadata: record.metadata || {},
    expiresAt: record.expires_at
  };
}

/**
 * Mark token as used IMMEDIATELY after validation
 * Prevents double-use attacks
 */
export async function markTokenUsed(rawToken) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const result = await sql`
    UPDATE token_registry
    SET used_at = CURRENT_TIMESTAMP
    WHERE token_hash = ${tokenHash} AND used_at IS NULL
    RETURNING id
  `;

  if (!result[0]) {
    throw new Error("Failed to mark token as used");
  }

  return result[0];
}

/**
 * Cleanup expired tokens (run periodically)
 */
export async function cleanupExpiredTokens() {
  await sql`
    DELETE FROM token_registry
    WHERE expires_at < CURRENT_TIMESTAMP
  `;
}

/**
 * Token types
 */
export const TOKEN_TYPES = {
  TASK_EMAIL: "task_email",
  TASK_COMPLETE: "task_complete",
  TASK_BLOCK: "task_block",
  AUTH_EMAIL: "auth_email",
  PASSWORD_RESET: "password_reset",
  EMAIL_VERIFICATION: "email_verification"
};

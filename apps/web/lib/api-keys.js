import crypto from 'crypto';

// Generate a new API key
// Format: lyr_live_[32 random chars]
// Example: lyr_live_a8f3k2m9p1x7q4n6r0t5w8y2
export function generateApiKey() {
  const prefix = 'lyr_live_';
  const randomPart = crypto.randomBytes(24).toString('base64url').substring(0, 32);
  const fullKey = `${prefix}${randomPart}`;
  return fullKey;
}

// Hash the key for storage - never store raw keys
export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Get the display prefix (first 16 chars + ...)
// Used to identify which key is which without exposing it
export function getKeyPrefix(key) {
  return key.substring(0, 16) + '...';
}

// Validate key format
export function isValidKeyFormat(key) {
  return key && key.startsWith('lyr_live_') && key.length === 41;
}

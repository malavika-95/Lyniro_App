/**
 * Rate limiting utilities for API routes
 * Prevents brute force attacks and abuse
 */

// In-memory store for rate limiting (replace with Redis in production)
const rateLimitStore = new Map();

// Rate limit thresholds
export const RATE_LIMITS = {
  LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  EMAIL: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 requests per hour
  API: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  DEFAULT: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute
};

/**
 * Get client IP from request headers
 */
export function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

/**
 * Generate rate limit key based on endpoint and identifier
 */
function getRateLimitKey(endpoint, identifier) {
  return `${endpoint}:${identifier}`;
}

/**
 * Enforce rate limiting on a request
 * @param {Request} request - NextJS request object
 * @param {Object} limit - Rate limit config { maxRequests, windowMs }
 * @param {String} endpoint - API endpoint identifier for logging
 * @throws {Error} If rate limit exceeded
 */
export function enforceRateLimit(request, limit, endpoint = 'unknown') {
  const clientIP = getClientIP(request);
  const key = getRateLimitKey(endpoint, clientIP);
  const now = Date.now();

  // Get or initialize rate limit record
  let record = rateLimitStore.get(key);

  if (!record) {
    // First request
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.windowMs,
    });
    return; // Allow first request
  }

  // Check if window has expired
  if (now > record.resetTime) {
    // Reset window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.windowMs,
    });
    return; // Allow request
  }

  // Increment counter
  record.count++;

  // Check if limit exceeded
  if (record.count > limit.maxRequests) {
    const secondsRemaining = Math.ceil((record.resetTime - now) / 1000);
    throw new Error(
      `Too many requests. Please try again in ${secondsRemaining} seconds.`
    );
  }
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

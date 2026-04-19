import { hashApiKey, isValidKeyFormat } from '@/lib/api-keys';
import sql from '@/app/api/utils/sql';

export async function authenticateApiKey(request) {
  // Check Authorization header: "Bearer lyr_live_xxxxx"
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header. Use: Authorization: Bearer YOUR_API_KEY', status: 401 };
  }

  const rawKey = authHeader.replace('Bearer ', '').trim();

  // Validate format
  if (!isValidKeyFormat(rawKey)) {
    return { error: 'Invalid API key format', status: 401 };
  }

  // Hash and look up
  const keyHash = hashApiKey(rawKey);

  const keyRecord = await sql`
    SELECT 
      k.id,
      k.vendor_id,
      k.permissions,
      k.is_active,
      k.expires_at,
      k.tier_required,
      k.revoked_at,
      vs.tier as vendor_tier
    FROM api_keys k
    JOIN vendor_subscriptions vs ON vs.vendor_id = k.vendor_id
    WHERE k.key_hash = ${keyHash}
  `;

  if (!keyRecord[0]) {
    return { error: 'Invalid API key', status: 401 };
  }

  const key = keyRecord[0];

  // Check if active
  if (!key.is_active || key.revoked_at) {
    return { error: 'This API key has been revoked', status: 401 };
  }

  // Check expiry
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return { error: 'This API key has expired', status: 401 };
  }

  // Check tier access
  const tierOrder = { free: 0, starter: 1, growth: 2, scale: 3 };
  const vendorTierLevel = tierOrder[key.vendor_tier] || 0;
  const requiredTierLevel = tierOrder[key.tier_required] || 2;

  if (vendorTierLevel < requiredTierLevel) {
    return { 
      error: `API access requires the Growth plan or higher. Your current plan is ${key.vendor_tier}.`,
      status: 403 
    };
  }

  // Check rate limit before updating last_used_at
  const recentUsage = await sql`
    SELECT COUNT(*) as count FROM api_key_usage 
    WHERE api_key_id = ${key.id} AND created_at > NOW() - INTERVAL '60 seconds'
  `;

  if (recentUsage[0].count >= 100) {
    return { 
      error: 'Rate limit exceeded. Maximum 100 requests per minute.',
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0'
      }
    };
  }

  // Update last_used_at
  await sql`
    UPDATE api_keys SET last_used_at = NOW() WHERE id = ${key.id}
  `;

  // Log usage
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  await sql`
    INSERT INTO api_key_usage (api_key_id, endpoint, method, status_code, ip_address)
    VALUES (
      ${key.id},
      ${request.nextUrl?.pathname || 'unknown'},
      ${request.method},
      200,
      ${ip}
    )
  `;

  return {
    vendorId: key.vendor_id,
    permissions: key.permissions || [],
    keyId: key.id,
    success: true
  };
}

// Check if API key has a specific permission
export function hasPermission(authResult, permission) {
  if (!authResult.permissions) return false;
  return authResult.permissions.includes(permission);
}

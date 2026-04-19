import { getCurrentUser } from '@/lib/session-utils';
import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import { generateApiKey, hashApiKey, getKeyPrefix } from '@/lib/api-keys';

export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== 'vendor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all API keys for this vendor (non-revoked)
    const keys = await sql`
      SELECT 
        k.id,
        k.name,
        k.key_prefix,
        k.is_active,
        k.permissions,
        k.last_used_at,
        k.expires_at,
        k.created_at,
        u.first_name,
        u.last_name
      FROM api_keys k
      LEFT JOIN csm_users u ON u.id = k.created_by
      WHERE k.vendor_id = ${user.organizationId} AND k.revoked_at IS NULL
      ORDER BY k.created_at DESC
    `;

    return NextResponse.json(keys);
  } catch (error) {
    console.error('[API Keys GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== 'vendor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners or managers can create API keys
    if (user.role !== 'owner' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check vendor subscription tier
    const subscription = await sql`
      SELECT tier FROM vendor_subscriptions WHERE vendor_id = ${user.organizationId}
    `;

    if (!subscription[0] || !['growth', 'scale'].includes(subscription[0].tier)) {
      return NextResponse.json(
        { error: 'API key access requires the Growth plan ($199/mo) or higher.' },
        { status: 403 }
      );
    }

    const { name, permissions, expires_in_days } = await request.json();

    // Validate name
    if (!name || typeof name !== 'string' || name.length > 50) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    // Generate and hash key
    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = getKeyPrefix(rawKey);

    // Determine expiry
    let expiresAt = null;
    if (expires_in_days && typeof expires_in_days === 'number' && expires_in_days > 0) {
      const now = new Date();
      expiresAt = new Date(now.getTime() + expires_in_days * 24 * 60 * 60 * 1000);
    }

    // Default permissions
    const perms = permissions || ['plans:read', 'plans:write', 'tasks:read', 'tasks:write', 'messages:read'];

    // Insert key
    const result = await sql`
      INSERT INTO api_keys (
        vendor_id,
        key_hash,
        key_prefix,
        name,
        permissions,
        expires_at,
        created_by
      ) VALUES (
        ${user.organizationId},
        ${keyHash},
        ${keyPrefix},
        ${name},
        ${JSON.stringify(perms)},
        ${expiresAt ? expiresAt.toISOString() : null},
        ${user.userId}
      )
      RETURNING id
    `;

    return NextResponse.json({
      success: true,
      key: rawKey,
      keyId: result[0].id,
      message: 'Copy this key now. It will never be shown again.'
    });
  } catch (error) {
    console.error('[API Keys POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}

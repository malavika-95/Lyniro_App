import { getCurrentUser } from '@/lib/session-utils';
import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== 'vendor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keyId } = await params;

    // Verify key belongs to this vendor
    const key = await sql`
      SELECT vendor_id FROM api_keys WHERE id = ${parseInt(keyId)}
    `;

    if (!key[0] || key[0].vendor_id !== user.organizationId) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const { name, permissions } = await request.json();

    if (!name && !permissions) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    let result;
    if (name && permissions) {
      result = await sql`
        UPDATE api_keys 
        SET name = ${name}, permissions = ${JSON.stringify(permissions)}
        WHERE id = ${parseInt(keyId)}
        RETURNING id, name, key_prefix, permissions
      `;
    } else if (name) {
      result = await sql`
        UPDATE api_keys 
        SET name = ${name}
        WHERE id = ${parseInt(keyId)}
        RETURNING id, name, key_prefix, permissions
      `;
    } else {
      result = await sql`
        UPDATE api_keys 
        SET permissions = ${JSON.stringify(permissions)}
        WHERE id = ${parseInt(keyId)}
        RETURNING id, name, key_prefix, permissions
      `;
    }

    if (!result[0]) {
      return NextResponse.json({ error: 'Failed to update key' }, { status: 500 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('[API Keys PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== 'vendor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keyId } = await params;

    // Verify key belongs to this vendor
    const key = await sql`
      SELECT vendor_id FROM api_keys WHERE id = ${parseInt(keyId)}
    `;

    if (!key[0] || key[0].vendor_id !== user.organizationId) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Revoke the key
    await sql`
      UPDATE api_keys 
      SET is_active = false, revoked_at = NOW(), revoked_by = ${user.userId}
      WHERE id = ${parseInt(keyId)}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Keys DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-session-utils';
import sql from '@/app/api/utils/sql';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

export async function POST(request, { params }) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { vendorId } = await params;
    const { targetUserId } = await request.json();
    const vendorIdNum = parseInt(vendorId);
    const targetUserIdNum = parseInt(targetUserId);

    // Verify user belongs to this vendor
    const user = await sql`
      SELECT id, email, first_name, vendor_id
      FROM csm_users
      WHERE id = ${targetUserIdNum} AND vendor_id = ${vendorIdNum}
    `;

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const targetUser = user[0];

    // Create impersonation session
    const sessionUUID = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await sql`
      INSERT INTO csm_sessions (csm_user_id, session_uuid, expires_at)
      VALUES (${targetUserIdNum}, ${sessionUUID}, ${expiresAt})
    `;

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('csm-session', `${targetUserIdNum}:${sessionUUID}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/'
    });

    // Log action
    await sql`
      INSERT INTO lyniro_audit_log (
        admin_id,
        admin_email,
        action,
        target_type,
        target_id,
        target_email,
        metadata
      )
      VALUES (
        ${admin.adminId},
        ${admin.email},
        'impersonated_user',
        'csm_user',
        ${targetUserIdNum},
        ${targetUser.email},
        ${{
          originalAdminEmail: admin.email,
          targetUserEmail: targetUser.email,
          targetUserName: targetUser.first_name
        }}
      )
    `;

    return NextResponse.json({
      success: true,
      redirectTo: '/'
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    return NextResponse.json(
      { error: 'Impersonation failed' },
      { status: 500 }
    );
  }
}

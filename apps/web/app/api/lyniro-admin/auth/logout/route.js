import { NextResponse } from 'next/server';
import { getCurrentAdmin, clearAdminSessionCookie } from '@/lib/admin-session-utils';
import sql from '@/app/api/utils/sql';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get session UUID from cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('lyniro-admin-session')?.value;
    const sessionUUID = sessionCookie?.split(':')[1];

    // Delete session from database
    if (sessionUUID) {
      await sql`
        DELETE FROM lyniro_admin_sessions
        WHERE session_uuid = ${sessionUUID}
      `;
    }

    // Log logout
    await sql`
      INSERT INTO lyniro_audit_log (admin_id, admin_email, action)
      VALUES (${admin.adminId}, ${admin.email}, 'admin_logout')
    `;

    // Clear cookie
    await clearAdminSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

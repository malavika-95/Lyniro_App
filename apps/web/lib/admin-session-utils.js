import { cookies } from 'next/headers';
import sql from '@/app/api/utils/sql';

const ADMIN_SESSION_COOKIE = 'lyniro-admin-session';
const SESSION_DURATION = 8 * 60 * 60; // 8 hours

export async function getCurrentAdmin() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (!sessionCookie) {
      return null;
    }

    const [adminId, sessionUUID] = sessionCookie.split(':');

    if (!adminId || !sessionUUID) {
      return null;
    }

    // Verify session exists and not expired
    const result = await sql`
      SELECT 
        las.id,
        las.admin_id,
        las.expires_at,
        la.id as admin_id_check,
        la.email,
        la.first_name,
        la.last_name,
        la.role
      FROM lyniro_admin_sessions las
      JOIN lyniro_admins la ON la.id = las.admin_id
      WHERE las.session_uuid = ${sessionUUID}
        AND las.admin_id = ${parseInt(adminId)}
        AND las.expires_at > NOW()
        AND la.is_active = true
    `;

    if (result.length === 0) {
      return null;
    }

    const session = result[0];

    // Update last_active_at
    await sql`
      UPDATE lyniro_admin_sessions
      SET last_active_at = NOW()
      WHERE session_uuid = ${sessionUUID}
    `;

    return {
      adminId: session.admin_id,
      email: session.email,
      firstName: session.first_name,
      lastName: session.last_name,
      role: session.role
    };
  } catch (error) {
    console.error('Error getting current admin:', error);
    return null;
  }
}

export async function setAdminSessionCookie(adminId, sessionUUID) {
  const cookieStore = await cookies();
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

  cookieStore.set(ADMIN_SESSION_COOKIE, `${adminId}:${sessionUUID}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/'
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

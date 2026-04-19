import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import sql from '@/app/api/utils/sql';
import { setAdminSessionCookie } from '@/lib/admin-session-utils';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Rate limiting - check attempts in last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentAttempts = await sql`
      SELECT COUNT(*) as count FROM lyniro_audit_log
      WHERE action = 'admin_login_attempt'
        AND target_email = ${email}
        AND created_at > ${fifteenMinutesAgo}
    `;

    if (recentAttempts[0].count >= 5) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Look up admin
    const adminResult = await sql`
      SELECT id, email, first_name, last_name, password_hash, role
      FROM lyniro_admins
      WHERE email = ${email} AND is_active = true
    `;

    // Always return same message for security
    if (adminResult.length === 0 || !adminResult[0].password_hash) {
      // Log failed attempt
      try {
        await sql`
          INSERT INTO lyniro_audit_log (admin_id, admin_email, action, target_email)
          VALUES (0, ${email}, 'admin_login_attempt', ${email})
        `;
      } catch (e) {
        // Ignore logging errors
      }
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const admin = adminResult[0];

    // Compare password
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatch) {
      try {
        await sql`
          INSERT INTO lyniro_audit_log (admin_id, admin_email, action, target_email)
          VALUES (${admin.id}, ${admin.email}, 'admin_login_attempt', ${email})
        `;
      } catch (e) {
        // Ignore
      }
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate session
    const sessionUUID = uuidv4();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    // Insert session
    await sql`
      INSERT INTO lyniro_admin_sessions (admin_id, session_uuid, expires_at)
      VALUES (${admin.id}, ${sessionUUID}, ${expiresAt})
    `;

    // Update last login
    await sql`
      UPDATE lyniro_admins
      SET last_login_at = NOW()
      WHERE id = ${admin.id}
    `;

    // Log successful login
    await sql`
      INSERT INTO lyniro_audit_log (admin_id, admin_email, action)
      VALUES (${admin.id}, ${admin.email}, 'admin_login')
    `;

    // Set cookie
    await setAdminSessionCookie(admin.id, sessionUUID);

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }
}

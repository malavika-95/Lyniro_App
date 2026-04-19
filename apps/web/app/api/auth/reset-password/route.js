import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import sql from '@/app/api/utils/sql';

export async function POST(request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and password required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Look up token
    const tokenResult = await sql`
      SELECT id, user_id, expires_at, used_at
      FROM password_reset_tokens
      WHERE token = ${token}
    `;

    if (tokenResult.length === 0) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    const tokenRecord = tokenResult[0];

    // Validate token
    if (tokenRecord.used_at) {
      return NextResponse.json(
        { error: 'This reset link has already been used. Please request a new one.' },
        { status: 400 }
      );
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await sql`
      UPDATE csm_users
      SET password_hash = ${hashedPassword}
      WHERE id = ${tokenRecord.user_id}
    `;

    // Mark token as used
    await sql`
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE id = ${tokenRecord.id}
    `;

    // Delete all sessions for this user
    await sql`
      DELETE FROM csm_sessions
      WHERE csm_user_id = ${tokenRecord.user_id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An error occurred while resetting your password' },
      { status: 500 }
    );
  }
}

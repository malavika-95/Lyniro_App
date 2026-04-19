import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import sql from '@/app/api/utils/sql';
import { sendEmail } from '@/lib/email/resend';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'If an account exists with this email, you will receive a reset link shortly.' 
        },
        { status: 200 }
      );
    }

    // Rate limiting - check attempts in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAttempts = await sql`
      SELECT COUNT(*) as count FROM lyniro_audit_log
      WHERE action = 'forgot_password_attempt'
        AND target_email = ${email}
        AND created_at > ${oneHourAgo}
    `;

    if (recentAttempts[0].count >= 3) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'If an account exists with this email, you will receive a reset link shortly.' 
        },
        { status: 200 }
      );
    }

    // Look up user
    const userResult = await sql`
      SELECT id, first_name, email
      FROM csm_users
      WHERE email = ${email}
    `;

    // Always return success for security (prevent email enumeration)
    if (userResult.length === 0) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'If an account exists with this email, you will receive a reset link shortly.' 
        },
        { status: 200 }
      );
    }

    const user = userResult[0];

    // Generate secure token
    const token = uuidv4() + '_' + uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Insert token
    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt})
    `;

    // Send email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lyniro.com';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Reset your Lyniro password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>Hi ${user.first_name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password.</p>
          <p style="margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p><strong>This link expires in 1 hour.</strong></p>
          <p>If you didn't request this password reset, you can safely ignore this email. Your password won't change unless you click the link above.</p>
          <p style="color: #666; font-size: 12px; margin-top: 40px;">
            This is an automated message, please don't reply to this email.
          </p>
        </div>
      `
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'If an account exists with this email, you will receive a reset link shortly.' 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { 
        success: true, 
        message: 'If an account exists with this email, you will receive a reset link shortly.' 
      },
      { status: 200 }
    );
  }
}

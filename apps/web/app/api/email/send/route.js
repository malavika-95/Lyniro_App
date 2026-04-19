import { sendEmail } from '@/lib/email/resend';
import { getCurrentUser } from '@/lib/session-utils';
import { requireAuth } from '@/lib/rbac';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // CRITICAL: Authenticate user - this endpoint must not be open
    const user = await getCurrentUser();
    requireAuth(user);
    
    const { to, subject, html, text, from, replyTo } = await request.json();

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    const data = await sendEmail({ to, subject, html, text, from, replyTo });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Email API] Failed to send email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}

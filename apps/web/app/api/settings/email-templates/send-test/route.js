import sql from '@/app/api/utils/sql';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session-utils';
import { sendEmail, sendVendorEmail } from '@/lib/email';

const sampleVariables = {
  client_name: 'Sarah Johnson',
  vendor_name: 'Acme Corp',
  plan_name: 'Enterprise Onboarding',
  task_name: 'Complete SSO Configuration',
  due_date: 'April 20, 2026',
  action_url: 'https://app.lyniro.com/customer',
  message_preview: 'Hi! Just wanted to check in on your progress with the SSO setup. Let me know if you need any help.',
  role: 'Manager'
};

const replaceVariables = (text, variables) => {
  if (!text) return text;
  return Object.entries(variables).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }, text);
};

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role: only owner and manager can send test
    if (user.role === 'member') {
      return NextResponse.json(
        { success: false, error: 'Only owners and managers can send test emails.' },
        { status: 403 }
      );
    }

    const { template_type, subject, body_html, from_name } = await request.json();
    const vendorId = user.organizationId;
    const userId = user.userId;
    const userEmail = user.email;

    // Replace variables with sample data
    const renderedSubject = replaceVariables(subject, sampleVariables);
    const renderedBody = replaceVariables(body_html, sampleVariables);

    // Get sender information for fromField calculation
    const vendorData = await sql`
      SELECT 
        v.email_send_mode,
        v.email_display_name,
        v.email_from_local_part,
        vcd.domain as custom_domain,
        vcd.status as domain_status,
        u.first_name,
        u.last_name,
        u.email_display_name as csm_display_name
      FROM vendors v
      LEFT JOIN vendor_custom_domains vcd ON vcd.vendor_id = v.id AND vcd.status = 'verified'
      LEFT JOIN csm_users u ON u.id = ${userId}
      WHERE v.id = ${vendorId}
    `;

    const vendor = vendorData[0];
    const hasVerifiedDomain = vendor?.custom_domain && vendor?.domain_status === 'verified';
    const sendMode = vendor?.email_send_mode || 'company';
    const companyDisplayName = vendor?.email_display_name || 'Your CS Team';
    const localPart = vendor?.email_from_local_part || 'noreply';

    let fromField;

    if (hasVerifiedDomain) {
      const domain = vendor.custom_domain;
      
      if (sendMode === 'individual' && vendor?.first_name) {
        const displayName = vendor.csm_display_name || `${vendor.first_name} ${vendor.last_name}`;
        const individualLocalPart = vendor.first_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        fromField = `${displayName} <${individualLocalPart}@${domain}>`;
      } else {
        fromField = `${companyDisplayName} <${localPart}@${domain}>`;
      }
    } else {
      const fallbackEmail = process.env.EMAIL_FROM_CLIENT || 'onboarding@resend.dev';
      
      if (sendMode === 'individual' && vendor?.first_name) {
        const displayName = vendor.csm_display_name || `${vendor.first_name} ${vendor.last_name}`;
        fromField = `${displayName} via ${companyDisplayName} <${fallbackEmail}>`;
      } else {
        fromField = `${companyDisplayName} <${fallbackEmail}>`;
      }
    }

    // Send the test email
    await sendEmail({
      to: userEmail,
      subject: renderedSubject,
      html: renderedBody,
      from: fromField
    });

    return NextResponse.json({
      success: true,
      sentTo: userEmail,
      sentFrom: fromField,
      message: `Test email sent from "${fromField}" to ${userEmail}`
    });
  } catch (error) {
    console.error('[email-templates send-test POST] Error:', error);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}

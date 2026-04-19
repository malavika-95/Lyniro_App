import sql from '@/app/api/utils/sql';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session-utils';

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

    const { template_type, variables } = await request.json();
    const vendorId = user.vendor_id;
    const mergedVariables = { ...sampleVariables, ...variables };

    // Look up the template
    const template = await sql`
      SELECT subject, preview_text, from_name, body_html
      FROM email_templates
      WHERE vendor_id = ${vendorId} AND template_type = ${template_type}
    `;

    if (!template || template.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const t = template[0];

    return NextResponse.json({
      success: true,
      data: {
        subject: replaceVariables(t.subject, mergedVariables),
        preview_text: replaceVariables(t.preview_text, mergedVariables),
        from_name: replaceVariables(t.from_name, mergedVariables),
        body_html: replaceVariables(t.body_html, mergedVariables)
      }
    });
  } catch (error) {
    console.error('[email-templates preview POST] Error:', error);
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
  }
}

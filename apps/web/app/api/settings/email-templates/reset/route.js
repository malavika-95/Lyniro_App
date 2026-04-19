import sql from '@/app/api/utils/sql';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session-utils';

const DEFAULT_TEMPLATES = {
  welcome_client: {
    subject: 'Welcome to {{plan_name}} — let\'s get started',
    preview_text: 'Your onboarding plan is ready',
    from_name: '{{vendor_name}}',
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F172A;">Welcome, {{client_name}}! 👋</h2>
        <p style="color:#475569;line-height:1.6;">We're excited to get started with you on <strong>{{plan_name}}</strong>.</p>
        <p style="color:#475569;line-height:1.6;">Your onboarding plan is ready and waiting. Click below to see your tasks and get moving.</p>
        <a href="{{action_url}}" style="display:inline-block;background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">View Your Onboarding Plan →</a>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">If you have any questions, just reply to this email.</p>
        <p style="color:#94A3B8;font-size:13px;">— {{vendor_name}}</p>
      </div>
    `
  },
  task_assigned: {
    subject: 'Action required: {{task_name}}',
    preview_text: 'You have a new task to complete',
    from_name: '{{vendor_name}}',
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F172A;">You have a new task</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{client_name}},</p>
        <p style="color:#475569;line-height:1.6;">A new task has been assigned to you as part of your <strong>{{plan_name}}</strong> onboarding:</p>
        <div style="background:#F8FAFC;border-left:4px solid #2563EB;padding:16px;border-radius:0 8px 8px 0;margin:16px 0;">
          <p style="font-weight:700;color:#0F172A;margin:0 0 8px;">{{task_name}}</p>
          <p style="color:#475569;margin:0;font-size:14px;">Due: {{due_date}}</p>
        </div>
        <a href="{{action_url}}" style="display:inline-block;background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Complete This Task →</a>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">— {{vendor_name}}</p>
      </div>
    `
  },
  task_completed: {
    subject: '✅ Task completed: {{task_name}}',
    preview_text: 'Great progress on your onboarding',
    from_name: '{{vendor_name}}',
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#059669;">Task completed ✅</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{client_name}},</p>
        <p style="color:#475569;line-height:1.6;">Great work! <strong>{{task_name}}</strong> has been marked as complete.</p>
        <p style="color:#475569;line-height:1.6;">Keep up the momentum — your next steps are waiting in your plan.</p>
        <a href="{{action_url}}" style="display:inline-block;background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Your Plan →</a>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">— {{vendor_name}}</p>
      </div>
    `
  },
  message_received: {
    subject: 'New message from {{vendor_name}}',
    preview_text: 'You have a new message about your onboarding',
    from_name: '{{vendor_name}}',
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F172A;">You have a new message</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{client_name}},</p>
        <p style="color:#475569;line-height:1.6;"><strong>{{vendor_name}}</strong> sent you a message about <strong>{{plan_name}}</strong>:</p>
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="color:#0F172A;margin:0;line-height:1.6;">{{message_preview}}</p>
        </div>
        <a href="{{action_url}}" style="display:inline-block;background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Reply in Your Portal →</a>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">— {{vendor_name}}</p>
      </div>
    `
  },
  plan_created: {
    subject: 'Your onboarding plan for {{plan_name}} is ready',
    preview_text: 'Your journey starts here',
    from_name: '{{vendor_name}}',
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F172A;">Your plan is ready 🎉</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{client_name}},</p>
        <p style="color:#475569;line-height:1.6;">Your onboarding plan for <strong>{{plan_name}}</strong> has been created. Everything you need to get started is in one place.</p>
        <a href="{{action_url}}" style="display:inline-block;background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Start Your Onboarding →</a>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">— {{vendor_name}}</p>
      </div>
    `
  },
  plan_completed: {
    subject: '🎉 Onboarding complete — you\'re all set!',
    preview_text: 'Congratulations on completing your onboarding',
    from_name: '{{vendor_name}}',
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#059669;">You're all set! 🎉</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{client_name}},</p>
        <p style="color:#475569;line-height:1.6;">Congratulations on completing your <strong>{{plan_name}}</strong> onboarding. You've done everything needed to get fully up and running.</p>
        <p style="color:#475569;line-height:1.6;">If you ever need support, don't hesitate to reach out.</p>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">— {{vendor_name}}</p>
      </div>
    `
  },
  invite_team_member: {
    subject: 'You\'ve been invited to join {{vendor_name}} on Lyniro',
    preview_text: 'Accept your invitation to get started',
    from_name: '{{vendor_name}}',
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F172A;">You've been invited 👋</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{client_name}},</p>
        <p style="color:#475569;line-height:1.6;">You've been invited to join <strong>{{vendor_name}}</strong>'s workspace on Lyniro as a <strong>{{role}}</strong>.</p>
        <a href="{{action_url}}" style="display:inline-block;background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Accept Invitation →</a>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">This invitation expires in 7 days.</p>
      </div>
    `
  }
};

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role: only owner and manager can reset
    if (user.role === 'member') {
      return NextResponse.json(
        { success: false, error: 'Only owners and managers can reset email templates.' },
        { status: 403 }
      );
    }

    const { template_type } = await request.json();
    const vendorId = user.vendor_id;

    if (!DEFAULT_TEMPLATES[template_type]) {
      return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
    }

    const defaultTemplate = DEFAULT_TEMPLATES[template_type];

    // Delete and re-insert with defaults
    await sql`
      DELETE FROM email_templates 
      WHERE vendor_id = ${vendorId} AND template_type = ${template_type}
    `;

    const result = await sql`
      INSERT INTO email_templates (vendor_id, template_type, subject, preview_text, from_name, body_html, is_active, created_at)
      VALUES (${vendorId}, ${template_type}, ${defaultTemplate.subject}, ${defaultTemplate.preview_text}, ${defaultTemplate.from_name}, ${defaultTemplate.body_html}, true, CURRENT_TIMESTAMP)
      RETURNING id, template_type, subject, preview_text, from_name, reply_to, body_html, is_active, updated_at
    `;

    return NextResponse.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('[email-templates reset POST] Error:', error);
    return NextResponse.json({ error: 'Failed to reset template' }, { status: 500 });
  }
}

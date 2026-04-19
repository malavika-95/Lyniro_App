import sql from '@/app/api/utils/sql';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session-utils';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.vendorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await sql`
      SELECT id, template_type, subject, body_html, preview_text, is_active, from_name, reply_to
      FROM email_templates
      WHERE vendor_id = ${session.user.vendorId}
      ORDER BY template_type ASC
    `;

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json({ error: 'Failed to fetch email templates' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getSession();
    if (!session?.user?.vendorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Accept both camelCase and snake_case from the frontend
    const body = await request.json();
    const id = body.id;
    const subject = body.subject;
    const bodyHtml = body.bodyHtml || body.body_html;
    const previewText = body.previewText || body.preview_text;
    const isActive = body.isActive !== undefined ? body.isActive : body.is_active;
    const fromName = body.fromName || body.from_name;
    const replyTo = body.replyTo || body.reply_to;

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Verify template belongs to vendor
    const template = await sql`
      SELECT id FROM email_templates
      WHERE id = ${id} AND vendor_id = ${session.user.vendorId}
    `;

    if (template.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const updated = await sql`
      UPDATE email_templates
      SET 
        subject = ${subject},
        body_html = ${bodyHtml},
        preview_text = ${previewText},
        is_active = ${isActive},
        from_name = ${fromName},
        reply_to = ${replyTo},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, template_type, subject, body_html, preview_text, is_active, from_name, reply_to
    `;

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating email template:', error);
    return NextResponse.json({ error: 'Failed to update email template' }, { status: 500 });
  }
}

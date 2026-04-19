import { Resend } from "resend";
import sql from "@/app/api/utils/sql";

const EMAIL_SENDERS = {
  vendor: 'onboarding@resend.dev',
  client: 'onboarding@resend.dev',
  system: 'onboarding@resend.dev'
  // Once custom domain is verified with Resend, update to:
  // vendor: 'noreply@lyniro.com',
  // client: 'noreply@lyniro.com',
  // system: 'system@lyniro.com'
};

export async function sendEmail({ to, subject, html, text, type = 'system', replyTo, from }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = from || EMAIL_SENDERS[type] || EMAIL_SENDERS.system;

  if (!apiKey) {
    console.log("[Email] Provider not configured - falling back to console.log");
    console.log("[Email] To:", to);
    console.log("[Email] From:", fromAddress);
    console.log("[Email] Subject:", subject);
    console.log("[Email] Body:", (html || text)?.substring(0, 100));
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html: html || `<p>${text}</p>`,
      reply_to: replyTo
    });

    if (result.error) {
      console.error("[Email] Failed to send:", result.error);
      return;
    }

    console.log("[Email] Sent successfully to:", to, "from:", fromAddress);
    return result;
  } catch (error) {
    console.error("[Email] Error sending email:", error);
  }
}

export async function sendVendorEmail({ vendorId, templateType, to, variables = {}, fallbackSubject, fallbackHtml, senderId }) {
  try {
    // Get vendor settings + custom domain + sender info in one query
    const vendorData = await sql`
      SELECT 
        v.email_send_mode,
        v.email_display_name,
        v.email_from_local_part,
        vcd.domain as custom_domain,
        vcd.status as domain_status,
        u.first_name,
        u.last_name,
        u.email as csm_email,
        u.email_display_name as csm_display_name
      FROM vendors v
      LEFT JOIN vendor_custom_domains vcd ON vcd.vendor_id = v.id AND vcd.status = 'verified'
      LEFT JOIN csm_users u ON u.id = ${senderId || null}
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
      
      if (sendMode === 'individual' && senderId && vendor?.first_name) {
        // Individual mode: "Sarah Chen <sarah@acmecorp.com>"
        const displayName = vendor.csm_display_name || `${vendor.first_name} ${vendor.last_name}`;
        const individualLocalPart = vendor.first_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        fromField = `${displayName} <${individualLocalPart}@${domain}>`;
      } else {
        // Company mode: "Acme Corp <noreply@acmecorp.com>"
        fromField = `${companyDisplayName} <${localPart}@${domain}>`;
      }
    } else {
      // No verified domain — use Lyniro's domain with their display name
      const fallbackEmail = process.env.EMAIL_FROM_CLIENT || 'onboarding@resend.dev';
      
      if (sendMode === 'individual' && senderId && vendor?.first_name) {
        const displayName = vendor.csm_display_name || `${vendor.first_name} ${vendor.last_name}`;
        fromField = `${displayName} via ${companyDisplayName} <${fallbackEmail}>`;
      } else {
        fromField = `${companyDisplayName} <${fallbackEmail}>`;
      }
    }

    // Get vendor's custom email template
    const template = await sql`
      SELECT subject, preview_text, from_name, reply_to, body_html, is_active
      FROM email_templates
      WHERE vendor_id = ${vendorId} AND template_type = ${templateType}
    `;

    let subject, body_html, reply_to;

    if (template[0] && template[0].is_active) {
      subject = template[0].subject;
      body_html = template[0].body_html;
      reply_to = template[0].reply_to;
    } else {
      subject = fallbackSubject;
      body_html = fallbackHtml;
    }

    // Replace variables
    const replaceVariables = (text) => {
      if (!text) return text;
      return Object.entries(variables).reduce((result, [key, value]) => {
        return result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
      }, text);
    };

    subject = replaceVariables(subject);
    body_html = replaceVariables(body_html);

    // Send
    await sendEmail({
      to,
      subject,
      html: body_html,
      from: fromField,
      replyTo: reply_to || (hasVerifiedDomain && sendMode === 'individual' && vendor?.csm_email ? vendor.csm_email : undefined)
    });

    return { success: true };
  } catch (error) {
    console.error('[sendVendorEmail] Error:', error);
    throw error;
  }
}

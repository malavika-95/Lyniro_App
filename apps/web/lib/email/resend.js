import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

if (!RESEND_API_KEY) {
  console.warn('[Resend] No API key configured. Set RESEND_API_KEY in your .env');
}

export const resend = new Resend(RESEND_API_KEY);

const EMAIL_SENDERS = {
  vendor: 'onboarding@resend.dev',
  client: 'onboarding@resend.dev',
  system: 'onboarding@resend.dev'
  // Once custom domain is verified with Resend, update to:
  // vendor: 'noreply@lyniro.com',
  // client: 'noreply@lyniro.com',
  // system: 'system@lyniro.com'
};

export async function sendEmail(params) {
  const { to, subject, html, text, from, replyTo, type = 'system' } = params;
  const fromEmail = from || EMAIL_SENDERS[type] || EMAIL_SENDERS.system;
  
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: html || undefined,
    text: text || undefined,
    reply_to: replyTo || undefined,
  });

  if (error) {
    console.error('[Resend] Failed to send email:', error);
    throw new Error(error.message);
  }

  return data;
}

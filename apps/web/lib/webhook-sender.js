import crypto from 'crypto';
import sql from '@/app/api/utils/sql';

export async function triggerWebhook(vendorId, event, data) {
  try {
    // Look up active webhooks for this vendor that subscribe to this event
    const webhooks = await sql`
      SELECT id, url, secret, events FROM webhooks
      WHERE vendor_id = ${vendorId} AND is_active = true
    `;

    for (const webhook of webhooks) {
      // Check if webhook subscribes to this event
      if (!webhook.events || !webhook.events.includes(event)) {
        continue;
      }

      // Fire and forget - don't block the main request
      // Use setImmediate or setTimeout to run asynchronously
      setImmediate(async () => {
        try {
          const payload = {
            event,
            data,
            timestamp: new Date().toISOString()
          };

          const body = JSON.stringify(payload);
          
          // Sign the payload
          const signature = 'sha256=' + crypto
            .createHmac('sha256', webhook.secret)
            .update(body)
            .digest('hex');

          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Lyniro-Signature': signature,
              'X-Lyniro-Event': event
            },
            body,
            timeout: 10000
          });

          // Log delivery
          await sql`
            INSERT INTO webhook_delivery_logs (webhook_id, event, status_code, response_text)
            VALUES (
              ${webhook.id},
              ${event},
              ${response.status},
              ${await response.text()}
            )
          `;
        } catch (error) {
          console.error(`[Webhook] Failed to deliver webhook ${webhook.id}:`, error);
          // Log the failure
          try {
            await sql`
              INSERT INTO webhook_delivery_logs (webhook_id, event, status_code, response_text)
              VALUES (${webhook.id}, ${event}, 0, ${error.message})
            `;
          } catch (logError) {
            console.error(`[Webhook] Failed to log delivery error:`, logError);
          }
        }
      });
    }
  } catch (error) {
    console.error('[Webhook] Error triggering webhooks:', error);
  }
}

import sql from "@/app/api/utils/sql";
import { sendEmail } from "@/lib/email/resend";
import { logActivity } from "@/app/api/utils/activity-log";

/**
 * Default email templates for when database templates are missing
 * These are fallbacks only — actual templates should be in email_templates table
 */
const DEFAULT_TEMPLATES = {
  plan_created: {
    subject: "Your Implementation Plan is Ready",
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F172A;">Your Plan is Ready 🎉</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{client_name}},</p>
        <p style="color:#475569;line-height:1.6;">Your implementation plan <strong>{{plan_name}}</strong> has been created and is ready to get started.</p>
        <p style="color:#475569;line-height:1.6;">
          <a href="{{action_url}}" style="color:#2563EB;text-decoration:none;">View your plan →</a>
        </p>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">— {{vendor_name}}</p>
      </div>
    `,
  },
  task_completed_by_customer: {
    subject: "✅ Task Completed: {{task_name}}",
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#059669;">Task Completed ✅</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{csm_name}},</p>
        <p style="color:#475569;line-height:1.6;">{{client_name}} has completed the task <strong>{{task_name}}</strong> as part of their {{plan_name}} implementation.</p>
        <p style="color:#475569;line-height:1.6;">
          <a href="{{action_url}}" style="color:#2563EB;text-decoration:none;">Review the task →</a>
        </p>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">— Lyniro</p>
      </div>
    `,
  },
  task_blocked: {
    subject: "⚠️ Task Blocked: {{task_name}}",
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#DC2626;">Task Blocked ⚠️</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{client_name}},</p>
        <p style="color:#475569;line-height:1.6;">The task <strong>{{task_name}}</strong> is currently blocked.</p>
        <p style="color:#475569;line-height:1.6;"><strong>Reason:</strong> {{blocked_reason}}</p>
        <p style="color:#475569;line-height:1.6;">Your CSM will reach out soon to help resolve this.</p>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">— {{vendor_name}}</p>
      </div>
    `,
  },
  csm_message: {
    subject: "New Message from {{csm_name}}",
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F172A;">You have a new message</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{client_name}},</p>
        <p style="color:#475569;line-height:1.6;"><strong>{{csm_name}}</strong> sent you a message about <strong>{{plan_name}}</strong>:</p>
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="color:#0F172A;margin:0;line-height:1.6;">{{message_preview}}</p>
        </div>
        <p style="color:#475569;line-height:1.6;">
          <a href="{{action_url}}" style="color:#2563EB;text-decoration:none;">Reply in your portal →</a>
        </p>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">— {{vendor_name}}</p>
      </div>
    `,
  },
  customer_message: {
    subject: "New Message from {{client_name}}",
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F172A;">New message from {{client_name}}</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{csm_name}},</p>
        <p style="color:#475569;line-height:1.6;"><strong>{{client_name}}</strong> sent you a message regarding <strong>{{plan_name}}</strong>:</p>
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="color:#0F172A;margin:0;line-height:1.6;">{{message_preview}}</p>
        </div>
        <p style="color:#475569;line-height:1.6;">
          <a href="{{action_url}}" style="color:#2563EB;text-decoration:none;">Reply in Lyniro →</a>
        </p>
      </div>
    `,
  },
  shared_note_added: {
    subject: "New Note in {{plan_name}}",
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F172A;">New note shared with you</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{recipient_name}},</p>
        <p style="color:#475569;line-height:1.6;">A new note has been shared with you in <strong>{{plan_name}}</strong>:</p>
        <div style="background:#F8FAFC;border-left:4px solid #2563EB;padding:16px;border-radius:0 8px 8px 0;margin:16px 0;">
          <p style="color:#0F172A;margin:0;line-height:1.6;">{{note_content}}</p>
        </div>
        <p style="color:#475569;line-height:1.6;">
          <a href="{{action_url}}" style="color:#2563EB;text-decoration:none;">View the plan →</a>
        </p>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">— {{vendor_name}}</p>
      </div>
    `,
  },
  plan_completed: {
    subject: "🎉 Implementation Complete",
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#059669;">You're All Set! 🎉</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{client_name}},</p>
        <p style="color:#475569;line-height:1.6;">Congratulations! You've successfully completed your <strong>{{plan_name}}</strong> implementation. You're all set to start using the platform.</p>
        <p style="color:#475569;line-height:1.6;">If you have any questions or need support, don't hesitate to reach out to {{csm_name}}.</p>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">— {{vendor_name}}</p>
      </div>
    `,
  },
  task_assigned: {
    subject: "Action Required: {{task_name}}",
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F172A;">You have a new task</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{client_name}},</p>
        <p style="color:#475569;line-height:1.6;">A new task has been assigned to you as part of your <strong>{{plan_name}}</strong> implementation:</p>
        <div style="background:#F8FAFC;border-left:4px solid #2563EB;padding:16px;border-radius:0 8px 8px 0;margin:16px 0;">
          <p style="font-weight:700;color:#0F172A;margin:0 0 8px;">{{task_name}}</p>
          <p style="color:#475569;margin:0;font-size:14px;">{{task_description}}</p>
        </div>
        <a href="{{action_url}}" style="display:inline-block;background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Complete This Task →</a>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">— {{vendor_name}}</p>
      </div>
    `,
  },
  stage_completed: {
    subject: "Stage Completed: {{stage_name}}",
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#059669;">Stage Completed ✅</h2>
        <p style="color:#475569;line-height:1.6;">Hi {{client_name}},</p>
        <p style="color:#475569;line-height:1.6;">Great progress! You've completed the <strong>{{stage_name}}</strong> stage of your {{plan_name}} implementation.</p>
        <p style="color:#475569;line-height:1.6;">On to the next one! Keep up the momentum.</p>
        <a href="{{action_url}}" style="display:inline-block;background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">View Next Tasks →</a>
        <p style="color:#94A3B8;font-size:13px;margin-top:24px;">— {{vendor_name}}</p>
      </div>
    `,
  },
  csm_assigned_task: {
    subject: "Task Assigned to {{client_name}}",
    body_html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F172A;">You assigned a task</h2>
        <p style="color:#475569;line-height:1.6;">Task <strong>{{task_name}}</strong> has been assigned to {{client_name}} in the {{plan_name}} plan.</p>
        <a href="{{action_url}}" style="display:inline-block;background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Track Progress →</a>
      </div>
    `,
  },
};

/**
 * Replace {{variable}} placeholders with actual values
 * @param {string} content - Template content with {{variable}} placeholders
 * @param {object} variables - Object with variable values
 * @returns {string} Content with variables replaced
 */
function replaceVariables(content, variables = {}) {
  if (!content) return content;

  return content.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    return variables[trimmedKey] !== undefined ? String(variables[trimmedKey]) : match;
  });
}

/**
 * Get plan details for notifications
 * @param {number} planId - Plan ID
 * @returns {Promise<object>} Plan details with vendor_id, customer info, CSM info
 */
async function getPlanDetails(planId) {
  try {
    // First try to get from onboarding_plans (main table)
    let plans = await sql`
      SELECT 
        p.id,
        COALESCE(p.customer_name, '') as plan_name,
        p.vendor_id,
        COALESCE(p.customer_email, '') as customer_email,
        COALESCE(p.customer_name, '') as customer_name,
        cu.id as csm_id,
        cu.email as csm_email,
        cu.first_name as csm_first_name,
        cu.last_name as csm_last_name,
        v.name as vendor_name,
        COALESCE(v.email_display_name, v.name) as vendor_display_name
      FROM onboarding_plans p
      LEFT JOIN csm_users cu ON p.csm_email = cu.email
      LEFT JOIN vendors v ON p.vendor_id::integer = v.id
      WHERE p.id = ${planId}
      LIMIT 1
    `;

    if (plans.length === 0) {
      throw new Error(`Plan ${planId} not found`);
    }

    return plans[0];
  } catch (error) {
    console.error(`[getPlanDetails] Failed to fetch plan ${planId}:`, error.message);
    throw error;
  }
}

/**
 * Send a notification via email using templates from the database
 * Falls back to DEFAULT_TEMPLATES if database template is missing or inactive
 *
 * @param {string} eventType - Type of event (e.g., "plan_created", "task_completed_by_customer")
 * @param {number} planId - ID of the plan
 * @param {object} variables - Variables to replace in template
 *   Example: { task_name: "Setup", blocked_reason: "Waiting for info", action_url: "https://...", message_preview: "..." }
 * @returns {Promise<{success: boolean, messageId?: string, recipient?: string, error?: string}>}
 */
async function sendNotification(eventType, planId, variables = {}) {
  try {
    // Validate inputs
    if (!eventType || !planId) {
      throw new Error("eventType and planId are required");
    }

    // Get plan details
    const plan = await getPlanDetails(planId);

    // Fetch template from database
    let template = null;
    try {
      const templates = await sql`
        SELECT subject, body_html, from_name, reply_to, is_active
        FROM email_templates
        WHERE vendor_id = ${plan.vendor_id}
          AND template_type = ${eventType}
          AND is_active = true
        LIMIT 1
      `;

      if (templates.length > 0) {
        template = templates[0];
      }
    } catch (dbError) {
      console.warn(
        `[sendNotification] Failed to fetch template from database: ${dbError.message}`
      );
    }

    // Fall back to default template if not found
    if (!template) {
      const defaultTemplate = DEFAULT_TEMPLATES[eventType];
      if (!defaultTemplate) {
        console.warn(`[sendNotification] No template found for event type: ${eventType}`);
        return {
          success: false,
          error: `No template found for event type: ${eventType}`,
        };
      }
      template = defaultTemplate;
    }

    // Prepare default variables from plan details
    const defaultVariables = {
      client_name: plan.customer_name || "Customer",
      plan_name: plan.plan_name || "Plan",
      csm_name: plan.csm_first_name
        ? `${plan.csm_first_name} ${plan.csm_last_name || ""}`.trim()
        : "Your CSM",
      vendor_name: plan.vendor_display_name || plan.vendor_name || "Our Team",
      recipient_name: plan.customer_name || "Customer",
    };

    // Merge with provided variables (provided variables override defaults)
    const allVariables = { ...defaultVariables, ...variables };

    // Replace variables in subject and body
    const subject = replaceVariables(template.subject, allVariables);
    const body_html = replaceVariables(template.body_html, allVariables);

    // Determine recipient email based on event type
    let recipientEmail = null;

    if (
      eventType === "customer_message" ||
      eventType === "task_completed_by_customer"
    ) {
      // Send to CSM
      recipientEmail = variables.csm_email || plan.csm_email;
    } else {
      // Send to customer
      recipientEmail = variables.customer_email || plan.customer_email;
    }

    // Validate recipient email
    if (!recipientEmail) {
      console.warn(
        `[sendNotification] No recipient email found for event type: ${eventType}`
      );
      return { success: false, error: "No recipient email found" };
    }

    // Prepare from address with fallback to default
    let fromAddress = "noreply@resend.dev";
    if (template.from_name) {
      const displayName = replaceVariables(template.from_name, allVariables);
      fromAddress = `${displayName} <noreply@resend.dev>`;
    }

    // Send email via Resend
    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html: body_html,
      from: fromAddress,
      replyTo: template.reply_to ? replaceVariables(template.reply_to, allVariables) : undefined,
      type: "vendor",
    });

    // Log activity (non-blocking)
    try {
      await logActivity(
        planId,
        variables.task_id || null,
        `notification_sent_${eventType}`,
        {
          event_type: eventType,
          recipient: recipientEmail,
          message_id: result?.id,
          subject: subject,
          sent_at: new Date().toISOString(),
        }
      );
    } catch (logError) {
      console.warn(
        `[sendNotification] Failed to log activity for ${eventType}: ${logError.message}`
      );
      // Don't throw — logging shouldn't break the notification send
    }

    console.info(`[sendNotification] Successfully sent ${eventType} to ${recipientEmail}`);

    return {
      success: true,
      messageId: result?.id,
      recipient: recipientEmail,
      eventType,
    };
  } catch (error) {
    console.error(`[sendNotification] Error sending ${eventType}:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send multiple notifications in parallel
 * @param {array} notifications - Array of { eventType, planId, variables }
 * @returns {Promise<array>} Array of notification results
 */
async function sendNotifications(notifications = []) {
  try {
    return await Promise.all(
      notifications.map((notification) =>
        sendNotification(
          notification.eventType,
          notification.planId,
          notification.variables
        )
      )
    );
  } catch (error) {
    console.error("[sendNotifications] Error:", error.message);
    throw error;
  }
}

/**
 * Send notification to a specific recipient (not tied to the plan's default recipient)
 * @param {string} eventType - Event type
 * @param {number} planId - Plan ID
 * @param {string} recipientEmail - Custom recipient email
 * @param {object} variables - Variables for template replacement
 * @returns {Promise<{success: boolean, messageId?: string, recipient?: string, error?: string}>}
 */
async function sendNotificationToRecipient(
  eventType,
  planId,
  recipientEmail,
  variables = {}
) {
  return sendNotification(eventType, planId, {
    ...variables,
    customer_email: recipientEmail,
  });
}

export {
  sendNotification,
  sendNotifications,
  sendNotificationToRecipient,
  replaceVariables,
  getPlanDetails,
};

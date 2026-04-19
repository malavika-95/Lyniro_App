import sql from "@/app/api/utils/sql";
import { logActivity } from "@/app/api/utils/activity-log";

/**
 * Fetch all messages for a plan with organization boundary check.
 * @param {number} planId - The plan ID
 * @param {number} organizationId - The vendor/organization ID for security validation
 * @returns {Promise<Array>} Array of messages ordered by created_at DESC
 */
export async function getMessages(planId, organizationId) {
  try {
    // Verify plan exists and belongs to organization
    const planCheck = await sql`
      SELECT id FROM onboarding_plans 
      WHERE id = ${planId} AND vendor_id = ${organizationId}
    `;

    if (!planCheck || planCheck.length === 0) {
      const error = new Error("Plan not found or access denied");
      error.statusCode = 404;
      throw error;
    }

    // Fetch all messages for this plan
    const messages = await sql`
      SELECT * FROM messages 
      WHERE plan_id = ${planId}
      ORDER BY created_at DESC
    `;

    return messages || [];
  } catch (error) {
    if (error.statusCode) throw error;
    const err = new Error("Failed to fetch messages");
    err.statusCode = 500;
    throw err;
  }
}

/**
 * Create a new message for a plan.
 * @param {number} planId - The plan ID
 * @param {number} senderId - The user/CSM ID sending the message
 * @param {string} senderType - Type of sender: 'csm' or 'customer'
 * @param {string} content - Message content
 * @param {number} organizationId - The vendor/organization ID for security validation
 * @returns {Promise<Object>} The newly created message
 */
export async function createMessage(planId, senderId, senderType, content, organizationId) {
  try {
    // Validate plan belongs to organization
    const planCheck = await sql`
      SELECT id FROM onboarding_plans 
      WHERE id = ${planId} AND vendor_id = ${organizationId}
    `;

    if (!planCheck || planCheck.length === 0) {
      const error = new Error("Plan not found or access denied");
      error.statusCode = 404;
      throw error;
    }

    // Validate inputs
    if (!content || content.trim().length === 0) {
      const error = new Error("Message content is required");
      error.statusCode = 400;
      throw error;
    }

    if (!senderType || !["csm", "customer"].includes(senderType)) {
      const error = new Error("Invalid sender type");
      error.statusCode = 400;
      throw error;
    }

    // Insert message
    const result = await sql`
      INSERT INTO messages (
        plan_id, 
        csm_id, 
        sender_type, 
        content, 
        is_read, 
        created_at
      ) VALUES (
        ${planId},
        ${senderType === "csm" ? senderId : null},
        ${senderType},
        ${content.trim()},
        false,
        CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const newMessage = result[0];

    // Log activity (non-blocking)
    logActivity(planId, null, "message_sent", {
      messageId: newMessage.id,
      senderType,
      senderId,
    }).catch((err) => {
      console.error("Failed to log message activity:", err);
    });

    return newMessage;
  } catch (error) {
    if (error.statusCode) throw error;
    const err = new Error("Failed to create message");
    err.statusCode = 500;
    throw err;
  }
}

/**
 * Mark messages as read for a plan by the current user.
 * Only marks messages that are not from the current user.
 * @param {number} planId - The plan ID
 * @param {number} organizationId - The vendor/organization ID for security validation
 * @param {number} userId - The current user ID
 * @param {string} userType - The current user type: 'csm' or 'customer'
 * @returns {Promise<Object>} Update result with count of marked messages
 */
export async function markPlanMessagesRead(planId, organizationId, userId, userType) {
  try {
    // Validate plan belongs to organization
    const planCheck = await sql`
      SELECT id FROM onboarding_plans 
      WHERE id = ${planId} AND vendor_id = ${organizationId}
    `;

    if (!planCheck || planCheck.length === 0) {
      const error = new Error("Plan not found or access denied");
      error.statusCode = 404;
      throw error;
    }

    // Build condition to exclude messages from current user
    // CSM messages marked as read by customer, and vice versa
    const excludeSenderType = userType === "csm" ? "csm" : "customer";

    // Mark unread messages as read (exclude messages from current user type)
    const result = await sql`
      UPDATE messages 
      SET is_read = true, 
          read_at = CURRENT_TIMESTAMP
      WHERE plan_id = ${planId} 
        AND is_read = false 
        AND sender_type != ${excludeSenderType}
      RETURNING id
    `;

    return {
      markedCount: result.length,
      planId,
    };
  } catch (error) {
    if (error.statusCode) throw error;
    const err = new Error("Failed to mark messages as read");
    err.statusCode = 500;
    throw err;
  }
}

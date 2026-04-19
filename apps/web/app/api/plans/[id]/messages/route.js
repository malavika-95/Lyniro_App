import { getMessages, createMessage, markPlanMessagesRead } from "@/lib/services/message-service";
import { getCurrentUser } from "@/lib/session-utils";
import { requireAuth, requirePlanAccess } from "@/lib/rbac";
import { sendNotification } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { checkRateLimit, getUserRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    requireAuth(user);
    await requirePlanAccess(user, id);

    // Pass organizationId to service (enforced organization boundary)
    const messages = await getMessages(parseInt(id), user.organizationId);

    // Mark as read for current user
    try {
      await markPlanMessagesRead(parseInt(id), user.organizationId);
    } catch (e) {
      console.error("[Messages] Read tracking error:", e);
    }

    return NextResponse.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error("[Messages] GET Error:", error.message);
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch messages"
      },
      { status: statusCode }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { content } = await request.json();
    const user = await getCurrentUser();

    requireAuth(user);
    await requirePlanAccess(user, id);

    // Rate limit messaging (user-based)
    const rateLimitKey = getUserRateLimitKey(user.userId, "message");
    const { allowed } = checkRateLimit(rateLimitKey, RATE_LIMITS.MESSAGE);

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too many messages. Please slow down." },
        { status: 429 }
      );
    }

    // Pass organizationId to service (enforced organization boundary)
    const message = await createMessage(
      parseInt(id),
      user.userId,
      user.role === "CLIENT" ? "customer" : "csm",
      content,
      user.organizationId
    );

    // Send notification
    try {
      await sendNotification(
        user.role === "CLIENT" ? "customer_message" : "csm_message",
        parseInt(id),
        { message }
      );
    } catch (notifError) {
      console.error("[Messages] Notification error:", notifError);
    }

    return NextResponse.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error("[Messages] POST Error:", error.message);
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send message"
      },
      { status: statusCode }
    );
  }
}

import { getCurrentUser } from "@/lib/session-utils";
import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get unread task notifications
    const notifications = await sql`
      SELECT 
        tn.id,
        tn.task_id,
        tn.type,
        tn.is_read,
        tn.created_at,
        tn.read_at,
        t.title,
        t.plan_id,
        p.customer_name,
        p.company_name
      FROM task_notifications tn
      LEFT JOIN tasks t ON tn.task_id = t.id
      LEFT JOIN onboarding_plans p ON t.plan_id = p.id
      WHERE tn.csm_id = ${user.userId}
      ORDER BY tn.created_at DESC
      LIMIT 50
    `;

    return NextResponse.json(notifications.map(n => ({
      id: n.id,
      taskId: n.task_id,
      type: n.type,
      isRead: n.is_read,
      taskTitle: n.title,
      planId: n.plan_id,
      customerName: n.customer_name,
      companyName: n.company_name,
      createdAt: n.created_at,
      readAt: n.read_at
    })));
  } catch (error) {
    console.error("[Task Notifications] Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: "Notification ID required" },
        { status: 400 }
      );
    }

    // Mark as read
    await sql`
      UPDATE task_notifications
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = ${notificationId}
      AND csm_id = ${user.userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Mark Notification Read] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}

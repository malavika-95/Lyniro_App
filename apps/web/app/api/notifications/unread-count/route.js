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

    // Count unread message notifications
    const messageNotifications = await sql`
      SELECT COUNT(*) as count
      FROM csm_message_notifications
      WHERE csm_id = ${user.userId}
      AND email_sent = false
    `;

    // Count unread task notifications
    const taskNotifications = await sql`
      SELECT COUNT(*) as count
      FROM task_notifications
      WHERE csm_id = ${user.userId}
      AND is_read = false
    `;

    return NextResponse.json({
      success: true,
      messageNotifications: messageNotifications[0]?.count || 0,
      taskNotifications: taskNotifications[0]?.count || 0,
      total: (messageNotifications[0]?.count || 0) + (taskNotifications[0]?.count || 0)
    });
  } catch (error) {
    console.error("[Unread Count] Error:", error);
    return NextResponse.json(
      {
        success: false,
        messageNotifications: 0,
        taskNotifications: 0,
        total: 0
      },
      { status: 500 }
    );
  }
}

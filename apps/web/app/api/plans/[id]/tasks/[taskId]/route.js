import { updateTask, getTaskCompletionStats } from "@/lib/services/task-service";
import { sendNotification } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/session-utils";
import { requireAuth, requirePlanAccess } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
  try {
    const { id: planId, taskId } = await params;
    const body = await request.json();
    
    console.log('🔧 Task update received:', { planId, taskId, body });

    // Authenticate user
    const user = await getCurrentUser();
    requireAuth(user);

    // Check plan access
    await requirePlanAccess(user, parseInt(planId));

    // ONLY allow these fields to be updated - NEVER touch title
    const allowedFields = {};
    if (body.status !== undefined) allowedFields.status = body.status;
    if (body.blockedReason !== undefined) allowedFields.blockedReason = body.blockedReason || null;

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    console.log('🔧 Fields being updated:', allowedFields);

    // Update task using service layer - NEVER include title
    const result = await updateTask(parseInt(planId), parseInt(taskId), allowedFields);

    console.log('✅ Task updated successfully:', result);

    // Get completion stats
    const stats = await getTaskCompletionStats(parseInt(planId));

    // Send notifications for certain statuses
    if (body.status === "completed") {
      try {
        await sendNotification("task_completed_by_customer", parseInt(planId), {
          completionPercent: stats.percentage
        });
      } catch (notifError) {
        console.error("[Task] Notification error:", notifError);
      }
    }

    if (body.status === "blocked" && body.blocked_reason) {
      try {
        await sendNotification("task_blocked", parseInt(planId), {
          reason: body.blocked_reason
        });
      } catch (notifError) {
        console.error("[Task] Notification error:", notifError);
      }
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Task update failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to update task: ${error.message}`
      },
      { status: 500 }
    );
  }
}
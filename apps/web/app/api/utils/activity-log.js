import sql from "@/app/api/utils/sql";

export async function logActivity(planId, taskId, action, metadata = null) {
  try {
    await sql`
      INSERT INTO activity_log (plan_id, task_id, action, created_at, metadata)
      VALUES (${planId}, ${taskId || null}, ${action}, CURRENT_TIMESTAMP, ${metadata ? JSON.stringify(metadata) : null})
    `;
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Don't throw - logging shouldn't break the main action
  }
}

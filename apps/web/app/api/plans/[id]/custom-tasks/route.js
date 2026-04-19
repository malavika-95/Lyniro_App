import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { requireAuth, requirePlanAccess } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { taskName, description, assignedTo, priority, dueDate, stageId } = await request.json();
    
    // CRITICAL: Authenticate user
    const user = await getCurrentUser();
    requireAuth(user);
    
    // CRITICAL: Check plan access (enforces org boundaries)
    await requirePlanAccess(user, id);

    // Create custom task
    const result = await sql`
      INSERT INTO tasks (
        plan_id,
        stage_id,
        title,
        description,
        assigned_to,
        status,
        custom_task,
        created_at
      ) VALUES (
        ${parseInt(id)},
        ${stageId},
        ${taskName},
        ${description || null},
        ${assignedTo},
        'pending',
        true,
        CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Failed to create custom task:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session-utils";

export async function GET(request) {
  try {
    // CRITICAL: Use verified session mechanism instead of inline parsing
    const user = await getCurrentUser();

    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify vendor_id is set (required after createPlan fix)
    if (!user.organizationId) {
      return NextResponse.json({ error: "Invalid vendor context" }, { status: 403 });
    }

    const csmId = user.userId;
    const vendorId = user.organizationId;

    // Get current user from csm_users
    const csm = await sql`
      SELECT id, role, manager_id, vendor_id, email
      FROM csm_users
      WHERE id = ${csmId} AND vendor_id = ${vendorId}
    `;

    if (!csm[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const csmUser = csm[0];
    let teamMemberIds = [csmUser.id];
    let teamMemberEmails = [csmUser.email];

    // Build team hierarchy based on role
    if (csmUser.role === "owner") {
      // Owner sees all users and plans
      const allTeam = await sql`
        SELECT id, email FROM csm_users WHERE vendor_id = ${vendorId}
      `;
      teamMemberIds = allTeam.map((u) => u.id);
      teamMemberEmails = allTeam.map((u) => u.email);
    } else if (csmUser.role === "manager") {
      // Manager sees only their juniors
      const juniors = await sql`
        SELECT id, email FROM csm_users WHERE manager_id = ${csmId}
      `;
      teamMemberIds = [csmUser.id, ...juniors.map((u) => u.id)];
      teamMemberEmails = [csmUser.email, ...juniors.map((u) => u.email)];
    }
    // User only sees their own data (teamMemberIds = [csmId])

    // Get metrics using parameterized queries (no SQL injection risk)
    const blockedTasksResult = await sql`
      SELECT COUNT(*) as count FROM tasks
      WHERE status = 'blocked' 
      AND plan_id IN (
        SELECT id FROM onboarding_plans 
        WHERE vendor_id = ${vendorId}
        AND csm_email = ANY(${teamMemberEmails}::text[])
      )
    `;

    const completedTasksResult = await sql`
      SELECT COUNT(*) as count FROM tasks
      WHERE status = 'completed'
      AND plan_id IN (
        SELECT id FROM onboarding_plans 
        WHERE vendor_id = ${vendorId}
        AND csm_email = ANY(${teamMemberEmails}::text[])
      )
    `;

    const totalTasksResult = await sql`
      SELECT COUNT(*) as count FROM tasks
      WHERE plan_id IN (
        SELECT id FROM onboarding_plans 
        WHERE vendor_id = ${vendorId}
        AND csm_email = ANY(${teamMemberEmails}::text[])
      )
    `;

    const plansResult = await sql`
      SELECT COUNT(DISTINCT id) as count FROM onboarding_plans op
      WHERE op.vendor_id = ${vendorId}
      AND op.csm_email = ANY(${teamMemberEmails}::text[])
    `;

    const unreadMessagesResult = await sql`
      SELECT COUNT(*) as count FROM messages
      WHERE is_read = false 
      AND sender_type = 'customer'
      AND csm_id = ANY(${teamMemberIds}::integer[])
    `;

    // Get overdue plans (past go-live date and not 100% complete)
    const overdueResult = await sql`
      SELECT COUNT(DISTINCT op.id) as count FROM onboarding_plans op
      WHERE op.vendor_id = ${vendorId}
      AND op.csm_email = ANY(${teamMemberEmails}::text[])
      AND op.go_live_date IS NOT NULL
      AND op.go_live_date < NOW()
      AND (SELECT COUNT(*) FROM tasks WHERE plan_id = op.id AND status = 'completed') 
        < (SELECT COUNT(*) FROM tasks WHERE plan_id = op.id)
    `;

    // Get team performance data (only for owner and manager)
    let teamPerformance = [];
    if (csm.role === "owner" || csm.role === "manager") {
      teamPerformance = await sql`
        SELECT 
          cu.id,
          cu.first_name,
          cu.last_name,
          cu.email,
          COUNT(DISTINCT op.id)::integer as active_plans,
          COUNT(DISTINCT CASE WHEN t.status = 'blocked' THEN t.id END)::integer as blocked_tasks,
          COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END)::integer as completed_tasks,
          COUNT(DISTINCT t.id)::integer as total_tasks
        FROM csm_users cu
        LEFT JOIN onboarding_plans op ON op.csm_email = cu.email
        LEFT JOIN tasks t ON t.plan_id = op.id
        WHERE cu.id = ANY(${teamMemberIds}::integer[])
        GROUP BY cu.id, cu.first_name, cu.last_name, cu.email
        ORDER BY active_plans DESC, blocked_tasks DESC
      `;
    }

    // Calculate completion percentage
    const totalTasks = parseInt(totalTasksResult[0]?.count || 0);
    const completedTasks = parseInt(completedTasksResult[0]?.count || 0);
    const completionPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return NextResponse.json({
      role: csm.role,
      metrics: {
        totalPlans: parseInt(plansResult[0]?.count || 0),
        blockedTasks: parseInt(blockedTasksResult[0]?.count || 0),
        completedTasks: completedTasks,
        totalTasks: totalTasks,
        completionPercentage: completionPercentage,
        unreadMessages: parseInt(unreadMessagesResult[0]?.count || 0),
        overduePlans: parseInt(overdueResult[0]?.count || 0),
      },
      teamPerformance: teamPerformance,
      viewingAs: csm.role,
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

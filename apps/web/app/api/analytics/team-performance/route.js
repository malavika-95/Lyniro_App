import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session-utils";

export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get CSM info from database
    const csmUser = await sql`
      SELECT id, role, manager_id, vendor_id
      FROM csm_users
      WHERE id = ${user.userId}
    `;

    if (!csmUser[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const csm = csmUser[0];
    const url = new URL(request.url);
    const dateRange = url.searchParams.get("dateRange") || "30";

    // Calculate date
    const now = new Date();
    const daysBack = parseInt(dateRange);
    const startDate = daysBack === 36500 ? new Date(0) : new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    let teamMembers;

    if (csm.role === "owner") {
      // Owner sees all member CSMs
      teamMembers = await sql`
        SELECT id, first_name, last_name, email
        FROM csm_users
        WHERE vendor_id = ${csm.vendor_id}
        AND role = 'member'
        ORDER BY first_name
      `;
    } else if (csm.role === "manager") {
      // Manager sees direct reports who are members
      teamMembers = await sql`
        SELECT id, first_name, last_name, email
        FROM csm_users
        WHERE manager_id = ${csm.id}
        AND role = 'member'
        ORDER BY first_name
      `;
    } else {
      // Member has no team view
      return NextResponse.json([]);
    }

    // Get performance data for each team member
    const performance = await Promise.all(
      teamMembers.map(async (member) => {
        // Active plans
        const activePlans = await sql`
          SELECT COUNT(DISTINCT id) as count
          FROM onboarding_plans
          WHERE csm_email = ${member.email}
          AND NOT EXISTS (
            SELECT 1 FROM tasks WHERE plan_id = id AND status != 'complete'
          ) IS FALSE
        `;

        // Avg completion %
        const avgCompletion = await sql`
          SELECT COALESCE(AVG(completion_pct), 0) as avg_pct
          FROM (
            SELECT 
              op.id,
              (COUNT(CASE WHEN t.status = 'complete' THEN 1 END)::float / 
               NULLIF(COUNT(t.id), 0) * 100) as completion_pct
            FROM onboarding_plans op
            LEFT JOIN tasks t ON op.id = t.plan_id
            WHERE op.csm_email = ${member.email}
            GROUP BY op.id
          ) sub
        `;

        // Avg duration for completed plans
        const avgDuration = await sql`
          SELECT COALESCE(AVG(EXTRACT(DAY FROM (MAX(t.completed_at) - op.created_at))), 0) as avg_days
          FROM onboarding_plans op
          LEFT JOIN tasks t ON op.id = t.plan_id
          WHERE op.csm_email = ${member.email}
          AND NOT EXISTS (
            SELECT 1 FROM tasks WHERE plan_id = op.id AND status != 'complete'
          )
          AND EXISTS (
            SELECT 1 FROM tasks WHERE plan_id = op.id 
            AND status = 'complete' AND completed_at >= ${startDate.toISOString()}
          )
          GROUP BY op.id
        `;

        // On-time rate
        const onTimeRate = await sql`
          SELECT 
            COALESCE(COUNT(DISTINCT CASE 
              WHEN op.go_live_date IS NOT NULL 
              AND MAX(t.completed_at) <= op.go_live_date 
              THEN op.id 
            END)::float / NULLIF(COUNT(DISTINCT op.id), 0) * 100, 0) as percentage
          FROM onboarding_plans op
          LEFT JOIN tasks t ON op.id = t.plan_id
          WHERE op.csm_email = ${member.email}
          AND NOT EXISTS (
            SELECT 1 FROM tasks WHERE plan_id = op.id AND status != 'complete'
          )
          AND EXISTS (
            SELECT 1 FROM tasks WHERE plan_id = op.id 
            AND status = 'complete' AND completed_at >= ${startDate.toISOString()}
          )
        `;

        // Blocked tasks
        const blockedTasks = await sql`
          SELECT COUNT(*) as count
          FROM tasks
          WHERE status = 'blocked'
          AND plan_id IN (
            SELECT id FROM onboarding_plans WHERE csm_email = ${member.email}
          )
        `;

        // Overdue plans
        const overduePlans = await sql`
          SELECT COUNT(DISTINCT op.id) as count
          FROM onboarding_plans op
          WHERE op.csm_email = ${member.email}
          AND op.go_live_date IS NOT NULL
          AND op.go_live_date < NOW()
          AND EXISTS (
            SELECT 1 FROM tasks WHERE plan_id = op.id AND status != 'complete'
          )
        `;

        // Last activity
        const lastActivity = await sql`
          SELECT MAX(created_at) as last_activity
          FROM (
            SELECT created_at FROM tasks WHERE plan_id IN (
              SELECT id FROM onboarding_plans WHERE csm_email = ${member.email}
            ) AND status = 'complete'
            UNION ALL
            SELECT created_at FROM messages WHERE plan_id IN (
              SELECT id FROM onboarding_plans WHERE csm_email = ${member.email}
            )
          ) combined
        `;

        // Status indicator (red if overdue or blocked > 2, amber if blocked tasks, green otherwise)
        const blocked = blockedTasks[0]?.count || 0;
        const overdue = overduePlans[0]?.count || 0;
        let status = "green";
        if (overdue > 0) status = "red";
        else if (blocked > 2) status = "red";
        else if (blocked > 0) status = "amber";

        return {
          id: member.id,
          name: `${member.first_name} ${member.last_name}`,
          email: member.email,
          activePlans: activePlans[0]?.count || 0,
          avgCompletion: Math.round(avgCompletion[0]?.avg_pct || 0),
          avgDuration: Math.round(avgDuration[0]?.avg_days || 0),
          onTimeRate: Math.round(onTimeRate[0]?.percentage || 0),
          blockedTasks: blocked,
          overduePlans: overdue,
          lastActivity: lastActivity[0]?.last_activity,
          status
        };
      })
    );

    // Sort by status (red first, then amber, then green)
    const statusOrder = { red: 0, amber: 1, green: 2 };
    performance.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return NextResponse.json(performance);
  } catch (error) {
    console.error("Team performance error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

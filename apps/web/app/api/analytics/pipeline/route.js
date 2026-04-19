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
      SELECT id, role, manager_id, vendor_id, email
      FROM csm_users
      WHERE id = ${user.userId}
    `;

    if (!csmUser[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const csm = csmUser[0];
    const url = new URL(request.url);
    const filterCsmId = url.searchParams.get("csmId");

    // Build team scope - only include member CSMs
    let csmEmails = [];

    if (csm.role === "owner") {
      if (filterCsmId && filterCsmId !== "all") {
        const csmData = await sql`SELECT email FROM csm_users WHERE id = ${parseInt(filterCsmId)} AND role = 'member'`;
        csmEmails = [csmData[0]?.email].filter(Boolean);
      } else {
        const allTeam = await sql`SELECT email FROM csm_users WHERE vendor_id = ${csm.vendor_id} AND role = 'member'`;
        csmEmails = allTeam.map(u => u.email);
      }
    } else if (csm.role === "manager") {
      if (filterCsmId && filterCsmId !== "all") {
        const csmData = await sql`SELECT email FROM csm_users WHERE id = ${parseInt(filterCsmId)} AND manager_id = ${csm.id} AND role = 'member'`;
        csmEmails = csmData.map(u => u.email);
      } else {
        const juniors = await sql`SELECT email FROM csm_users WHERE manager_id = ${csm.id} AND role = 'member'`;
        csmEmails = juniors.map(u => u.email);
      }
    } else {
      // Member only sees their own data
      csmEmails = [csm.email];
    }

    // Plans by Stage
    const plansByStage = await sql`
      SELECT 
        ts.name as stage,
        COUNT(DISTINCT op.id) as count
      FROM onboarding_plans op
      JOIN template_stages ts ON op.template_id = ts.template_id
      WHERE op.csm_email = ANY(${csmEmails}::text[])
      AND NOT EXISTS (
        SELECT 1 FROM tasks WHERE plan_id = op.id AND status != 'complete'
      ) IS FALSE
      GROUP BY ts.name, ts.stage_number
      ORDER BY ts.stage_number
    `;

    // Average Days Per Stage
    const avgDaysPerStage = await sql`
      SELECT 
        ts.name as stage,
        ts.stage_number,
        COALESCE(AVG(EXTRACT(DAY FROM (
          CASE WHEN ts.stage_number < (
            SELECT MAX(ts2.stage_number)
            FROM template_stages ts2
            JOIN tasks t2 ON t2.plan_id = op.id AND t2.status = 'complete'
          ) THEN (
            SELECT MIN(t3.completed_at)
            FROM tasks t3
            WHERE t3.plan_id = op.id
            AND t3.status = 'complete'
            AND EXISTS (
              SELECT 1 FROM template_tasks tt
              JOIN template_stages ts3 ON tt.stage_id = ts3.id
              WHERE tt.id = t3.task_id
              AND ts3.stage_number = ts.stage_number + 1
            )
          ) ELSE NOW() END
          - 
          CASE WHEN ts.stage_number = 1 THEN op.created_at ELSE (
            SELECT MAX(t4.completed_at)
            FROM tasks t4
            WHERE t4.plan_id = op.id
            AND t4.status = 'complete'
            AND EXISTS (
              SELECT 1 FROM template_tasks tt
              JOIN template_stages ts4 ON tt.stage_id = ts4.id
              WHERE tt.id = t4.task_id
              AND ts4.stage_number = ts.stage_number - 1
            )
          ) END
        ))), 0) as avg_days
      FROM onboarding_plans op
      JOIN template_stages ts ON op.template_id = ts.template_id
      WHERE op.csm_email = ANY(${csmEmails}::text[])
      GROUP BY ts.name, ts.stage_number
      ORDER BY ts.stage_number
    `;

    // Most Blocked Tasks
    const mostBlocked = await sql`
      SELECT 
        tt.name as task_name,
        ts.name as stage_name,
        COUNT(*) as block_count
      FROM tasks t
      JOIN template_tasks tt ON t.task_id = tt.id
      JOIN template_stages ts ON tt.stage_id = ts.id
      WHERE t.status = 'blocked'
      AND t.plan_id IN (
        SELECT id FROM onboarding_plans WHERE csm_email = ANY(${csmEmails}::text[])
      )
      GROUP BY tt.name, ts.name
      ORDER BY block_count DESC
      LIMIT 5
    `;

    return NextResponse.json({
      plansByStage: plansByStage || [],
      avgDaysPerStage: avgDaysPerStage || [],
      mostBlocked: mostBlocked || []
    });
  } catch (error) {
    console.error("Pipeline analytics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

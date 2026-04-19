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
    const dateRange = url.searchParams.get("dateRange") || "30";
    const filterCsmId = url.searchParams.get("csmId");

    // Calculate date
    const now = new Date();
    const daysBack = parseInt(dateRange);
    const startDate = daysBack === 36500 ? new Date(0) : new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

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

    // Get weekly activity
    const trends = await sql`
      SELECT 
        DATE_TRUNC('week', date)::DATE as week_start,
        COALESCE(customer_tasks, 0) as customer_tasks,
        COALESCE(vendor_tasks, 0) as vendor_tasks,
        COALESCE(messages, 0) as messages
      FROM (
        SELECT DISTINCT DATE_TRUNC('week', NOW() - (generate_series(0, ${daysBack})) * INTERVAL '1 day')::DATE as date
      ) weeks
      LEFT JOIN (
        SELECT 
          DATE_TRUNC('week', completed_at)::DATE as week_start,
          COUNT(*) as customer_tasks
        FROM tasks t
        WHERE t.assigned_to = 'customer'
        AND t.status = 'complete'
        AND t.completed_at >= ${startDate.toISOString()}
        AND t.plan_id IN (
          SELECT id FROM onboarding_plans WHERE csm_email = ANY(${csmEmails}::text[])
        )
        GROUP BY DATE_TRUNC('week', completed_at)
      ) ct ON weeks.date = ct.week_start
      LEFT JOIN (
        SELECT 
          DATE_TRUNC('week', completed_at)::DATE as week_start,
          COUNT(*) as vendor_tasks
        FROM tasks t
        WHERE t.assigned_to = 'vendor'
        AND t.status = 'complete'
        AND t.completed_at >= ${startDate.toISOString()}
        AND t.plan_id IN (
          SELECT id FROM onboarding_plans WHERE csm_email = ANY(${csmEmails}::text[])
        )
        GROUP BY DATE_TRUNC('week', completed_at)
      ) vt ON weeks.date = vt.week_start
      LEFT JOIN (
        SELECT 
          DATE_TRUNC('week', created_at)::DATE as week_start,
          COUNT(*) as messages
        FROM messages m
        WHERE m.created_at >= ${startDate.toISOString()}
        AND m.plan_id IN (
          SELECT id FROM onboarding_plans WHERE csm_email = ANY(${csmEmails}::text[])
        )
        GROUP BY DATE_TRUNC('week', created_at)
      ) m ON weeks.date = m.week_start
      WHERE weeks.date >= ${startDate.toISOString()}
      ORDER BY weeks.date ASC
    `;

    return NextResponse.json(trends || []);
  } catch (error) {
    console.error("Activity trend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

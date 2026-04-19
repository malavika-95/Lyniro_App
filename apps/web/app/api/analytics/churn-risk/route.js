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

    // High Risk Plans
    const highRisk = await sql`
      SELECT 
        op.id,
        op.customer_name,
        op.company_name,
        cu.first_name || ' ' || cu.last_name as csm_name,
        COALESCE(json_agg(json_build_object(
          'label', risk_reason
        )) FILTER (WHERE risk_reason IS NOT NULL), '[]') as risk_reasons,
        COALESCE(json_agg(DISTINCT json_build_object(
          'label', risk_reason
        )) FILTER (WHERE risk_reason IS NOT NULL), '[]') as risk_reasons,
        ROUND((COUNT(CASE WHEN t.status = 'complete' THEN 1 END)::float / NULLIF(COUNT(t.id), 0) * 100), 0) as completion_pct,
        COALESCE(EXTRACT(DAY FROM (NOW() - MAX(t.completed_at))), EXTRACT(DAY FROM (NOW() - op.created_at))) as days_since_activity
      FROM onboarding_plans op
      JOIN csm_users cu ON op.csm_email = cu.email
      LEFT JOIN tasks t ON op.id = t.plan_id
      WHERE op.csm_email = ANY(${csmEmails}::text[])
      AND (
        (op.go_live_date IS NOT NULL AND op.go_live_date < NOW() AND EXISTS (
          SELECT 1 FROM tasks WHERE plan_id = op.id AND status != 'complete'
        ))
        OR COALESCE(EXTRACT(DAY FROM (NOW() - MAX(t.completed_at))), EXTRACT(DAY FROM (NOW() - op.created_at))) > 10
        OR (SELECT COUNT(*) FROM tasks WHERE plan_id = op.id AND status = 'blocked') >= 3
      )
      GROUP BY op.id, op.customer_name, op.company_name, cu.first_name, cu.last_name
      ORDER BY op.id
    `;

    // Medium Risk Plans
    const mediumRisk = await sql`
      SELECT 
        op.id,
        op.customer_name,
        op.company_name,
        cu.first_name || ' ' || cu.last_name as csm_name,
        COALESCE(json_agg(DISTINCT json_build_object(
          'label', risk_reason
        )) FILTER (WHERE risk_reason IS NOT NULL), '[]') as risk_reasons,
        ROUND((COUNT(CASE WHEN t.status = 'complete' THEN 1 END)::float / NULLIF(COUNT(t.id), 0) * 100), 0) as completion_pct,
        COALESCE(EXTRACT(DAY FROM (NOW() - MAX(t.completed_at))), EXTRACT(DAY FROM (NOW() - op.created_at))) as days_since_activity
      FROM onboarding_plans op
      JOIN csm_users cu ON op.csm_email = cu.email
      LEFT JOIN tasks t ON op.id = t.plan_id
      WHERE op.csm_email = ANY(${csmEmails}::text[])
      AND (
        COALESCE(EXTRACT(DAY FROM (NOW() - MAX(t.completed_at))), EXTRACT(DAY FROM (NOW() - op.created_at))) BETWEEN 5 AND 9
        OR (SELECT COUNT(*) FROM tasks WHERE plan_id = op.id AND status = 'blocked') = 2
        OR (op.go_live_date IS NOT NULL AND op.go_live_date < NOW() + INTERVAL '7 days' AND op.go_live_date > NOW() AND 
          (COUNT(CASE WHEN t.status = 'complete' THEN 1 END)::float / NULLIF(COUNT(t.id), 0) * 100) < 60)
      )
      AND NOT (
        (op.go_live_date IS NOT NULL AND op.go_live_date < NOW() AND EXISTS (
          SELECT 1 FROM tasks WHERE plan_id = op.id AND status != 'complete'
        ))
        OR COALESCE(EXTRACT(DAY FROM (NOW() - MAX(t.completed_at))), EXTRACT(DAY FROM (NOW() - op.created_at))) > 10
        OR (SELECT COUNT(*) FROM tasks WHERE plan_id = op.id AND status = 'blocked') >= 3
      )
      GROUP BY op.id, op.customer_name, op.company_name, cu.first_name, cu.last_name
      ORDER BY op.id
    `;

    // Recently Completed
    const recentlyCompleted = await sql`
      SELECT 
        op.id,
        op.customer_name,
        op.company_name,
        cu.first_name || ' ' || cu.last_name as csm_name,
        100 as completion_pct,
        COALESCE(EXTRACT(DAY FROM (NOW() - MAX(t.completed_at))), 0) as days_since_activity
      FROM onboarding_plans op
      JOIN csm_users cu ON op.csm_email = cu.email
      LEFT JOIN tasks t ON op.id = t.plan_id
      WHERE op.csm_email = ANY(${csmEmails}::text[])
      AND NOT EXISTS (
        SELECT 1 FROM tasks WHERE plan_id = op.id AND status != 'complete'
      )
      AND EXISTS (
        SELECT 1 FROM tasks WHERE plan_id = op.id 
        AND status = 'complete' AND completed_at >= NOW() - INTERVAL '14 days'
      )
      GROUP BY op.id, op.customer_name, op.company_name, cu.first_name, cu.last_name
      ORDER BY MAX(t.completed_at) DESC
    `;

    return NextResponse.json({
      highRisk: highRisk || [],
      mediumRisk: mediumRisk || [],
      recentlyCompleted: recentlyCompleted || []
    });
  } catch (error) {
    console.error("Churn risk error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

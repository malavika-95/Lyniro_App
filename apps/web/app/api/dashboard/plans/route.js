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

    // Get current user with full role info
    const csm = await sql`
      SELECT id, role, manager_id, vendor_id, email
      FROM csm_users
      WHERE id = ${csmId} AND vendor_id = ${vendorId}
    `;

    if (!csm[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const csmUser = csm[0];
    let teamMemberEmails = [csmUser.email];

    // Build team hierarchy based on role
    if (csmUser.role === "owner") {
      const allTeam = await sql`
        SELECT email FROM csm_users WHERE vendor_id = ${vendorId}
      `;
      teamMemberEmails = allTeam.map((u) => u.email);
    } else if (csmUser.role === "manager") {
      const juniors = await sql`
        SELECT email FROM csm_users WHERE manager_id = ${csmId}
      `;
      teamMemberEmails = [csmUser.email, ...juniors.map((u) => u.email)];
    }

    // Get plans visible to this user with CSM info, template names, and stage counts
    const plans = await sql`
      SELECT 
        op.id,
        op.customer_name,
        op.company_name,
        op.customer_email,
        op.created_at,
        op.go_live_date,
        cu.id as csm_id,
        cu.first_name as csm_first_name,
        cu.last_name as csm_last_name,
        cu.email as csm_email,
        t.id as template_id,
        t.name as template_name,
        t.estimated_duration_days,
        COUNT(DISTINCT CASE WHEN ta.status = 'complete' THEN ta.id END)::integer as completed_tasks,
        COUNT(DISTINCT ta.id)::integer as total_tasks,
        COUNT(DISTINCT CASE WHEN ta.status = 'blocked' THEN ta.id END)::integer as blocked_tasks,
        MAX(ta.completed_at) as last_activity,
        COALESCE(COUNT(DISTINCT ts.id), 0)::integer as stage_count
      FROM onboarding_plans op
      LEFT JOIN csm_users cu ON op.csm_email = cu.email
      LEFT JOIN templates t ON op.template_id = t.id
      LEFT JOIN template_stages ts ON t.id = ts.template_id
      LEFT JOIN tasks ta ON op.id = ta.plan_id
      WHERE op.vendor_id = ${vendorId}
      AND op.csm_email = ANY(${teamMemberEmails}::text[])
      GROUP BY op.id, cu.id, cu.first_name, cu.last_name, cu.email, t.id, t.name, t.estimated_duration_days, op.go_live_date
      ORDER BY op.created_at DESC
    `;

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Plans list error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

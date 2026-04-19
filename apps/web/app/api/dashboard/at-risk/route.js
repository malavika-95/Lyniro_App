import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const csmUser = await sql`
      SELECT id, role, manager_id, vendor_id, email
      FROM csm_users
      WHERE id = ${user.userId}
    `;

    if (!csmUser[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const csm = csmUser[0];
    let teamMemberEmails = [csm.email];

    if (csm.role === "OWNER") {
      const allTeam = await sql`
        SELECT email FROM csm_users WHERE vendor_id = ${csm.vendor_id || 1}
      `;
      teamMemberEmails = allTeam.map((u) => u.email);
    } else if (csm.role === "MANAGER") {
      const juniors = await sql`
        SELECT email FROM csm_users WHERE manager_id = ${csm.id}
      `;
      teamMemberEmails = [csm.email, ...juniors.map((u) => u.email)];
    }

    // Get plans that are at risk
    const atRiskPlans = await sql`
      SELECT 
        op.id,
        op.customer_name,
        op.company_name,
        op.go_live_date,
        cu.id as csm_id,
        cu.first_name as csm_first_name,
        cu.last_name as csm_last_name,
        cu.email as csm_email,
        COUNT(DISTINCT CASE WHEN t.status = 'complete' THEN t.id END)::integer as completed_tasks,
        COUNT(DISTINCT t.id)::integer as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'blocked' THEN t.id END)::integer as blocked_tasks,
        MAX(t.completed_at) as last_activity
      FROM onboarding_plans op
      LEFT JOIN csm_users cu ON op.csm_email = cu.email
      LEFT JOIN tasks t ON op.id = t.plan_id
      WHERE op.vendor_id = ${csm.vendor_id || 1}
      AND op.csm_email = ANY(${teamMemberEmails}::text[])
      GROUP BY op.id, cu.id, cu.first_name, cu.last_name, cu.email, op.go_live_date
    `;

    // Filter for at-risk plans
    const atRisk = atRiskPlans.filter((plan) => {
      const isCompleted = plan.total_tasks > 0 && 
        plan.completed_tasks === plan.total_tasks;
      
      // Overdue: past go-live date and not complete
      const isOverdue = plan.go_live_date && 
        new Date(plan.go_live_date) < new Date() && 
        !isCompleted;
      
      // Blocked: 2+ blocked tasks
      const hasMultipleBlocked = plan.blocked_tasks >= 2;
      
      // Stalled: no activity in last 7 days and not complete
      const lastActivityDate = plan.last_activity ? 
        new Date(plan.last_activity) : 
        new Date(plan.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const isStalled = lastActivityDate < sevenDaysAgo && !isCompleted;

      return isOverdue || hasMultipleBlocked || isStalled;
    });

    // Add risk flags to each plan
    const enrichedAtRisk = atRisk.map((plan) => {
      const isCompleted = plan.total_tasks > 0 && 
        plan.completed_tasks === plan.total_tasks;
      
      const risks = [];
      
      if (plan.go_live_date && 
          new Date(plan.go_live_date) < new Date() && 
          !isCompleted) {
        risks.push({ type: 'overdue', label: 'Overdue' });
      }
      
      if (plan.blocked_tasks >= 2) {
        risks.push({ type: 'blocked', label: `${plan.blocked_tasks} blocked` });
      }
      
      const lastActivityDate = plan.last_activity ? 
        new Date(plan.last_activity) : 
        new Date(plan.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (lastActivityDate < sevenDaysAgo && !isCompleted) {
        risks.push({ type: 'stalled', label: 'Stalled' });
      }

      return {
        ...plan,
        risks,
      };
    });

    return NextResponse.json(enrichedAtRisk);
  } catch (error) {
    console.error("At-risk plans error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session-utils";

export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get CSM info from database to get all needed details
    const csmUser = await sql`
      SELECT id, role, manager_id, vendor_id, email
      FROM csm_users
      WHERE id = ${user.userId}
    `;

    if (!csmUser[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const csm = csmUser[0];

    // Get date range from query params
    const url = new URL(request.url);
    const dateRange = url.searchParams.get("dateRange") || "30";
    const filterCsmId = url.searchParams.get("csmId");

    // Calculate date boundaries
    const now = new Date();
    const daysBack = parseInt(dateRange);
    const startDate = daysBack === 36500 ? new Date(0) : new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(startDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Build team scope based on role - only include CSMs with plans (role='member')
    let csmEmails = [];

    if (csm.role === "owner") {
      if (filterCsmId && filterCsmId !== "all") {
        // Owner filtering by specific CSM (must be a member)
        const csmData = await sql`SELECT email FROM csm_users WHERE id = ${parseInt(filterCsmId)} AND role = 'member'`;
        csmEmails = [csmData[0]?.email].filter(Boolean);
      } else {
        // Owner sees all member CSMs
        const allTeam = await sql`SELECT email FROM csm_users WHERE vendor_id = ${csm.vendor_id} AND role = 'member'`;
        csmEmails = allTeam.map(u => u.email);
      }
    } else if (csm.role === "manager") {
      if (filterCsmId && filterCsmId !== "all") {
        // Manager viewing specific direct report
        const csmData = await sql`SELECT email FROM csm_users WHERE id = ${parseInt(filterCsmId)} AND manager_id = ${csm.id} AND role = 'member'`;
        csmEmails = csmData.map(u => u.email);
      } else {
        // Manager sees direct reports only (not including self)
        const juniors = await sql`SELECT email FROM csm_users WHERE manager_id = ${csm.id} AND role = 'member'`;
        csmEmails = juniors.map(u => u.email);
      }
    } else {
      // Member only sees their own data
      csmEmails = [csm.email];
    }

    // Total Active Plans (not 100% complete)
    const activePlansResult = await sql`
      SELECT COUNT(DISTINCT op.id) as count
      FROM onboarding_plans op
      WHERE op.csm_email = ANY(${csmEmails}::text[])
      AND NOT EXISTS (
        SELECT 1 FROM tasks WHERE plan_id = op.id AND status != 'complete'
      ) IS FALSE
    `;

    // Plans Completed This Period
    const completedThisPeriodResult = await sql`
      SELECT COUNT(DISTINCT op.id) as count
      FROM onboarding_plans op
      WHERE op.csm_email = ANY(${csmEmails}::text[])
      AND NOT EXISTS (
        SELECT 1 FROM tasks WHERE plan_id = op.id AND status != 'complete'
      )
      AND EXISTS (
        SELECT 1 FROM tasks WHERE plan_id = op.id 
        AND status = 'complete' AND completed_at >= ${startDate.toISOString()}
      )
    `;

    // Plans Completed Previous Period (for trend)
    const completedPreviousPeriodResult = await sql`
      SELECT COUNT(DISTINCT op.id) as count
      FROM onboarding_plans op
      WHERE op.csm_email = ANY(${csmEmails}::text[])
      AND NOT EXISTS (
        SELECT 1 FROM tasks WHERE plan_id = op.id AND status != 'complete'
      )
      AND EXISTS (
        SELECT 1 FROM tasks WHERE plan_id = op.id 
        AND status = 'complete' AND completed_at >= ${previousStartDate.toISOString()}
        AND completed_at < ${startDate.toISOString()}
      )
    `;

    // Average Onboarding Duration (days from creation to 100% complete)
    const avgDurationResult = await sql`
      SELECT COALESCE(AVG(EXTRACT(DAY FROM (MAX(t.completed_at) - op.created_at))), 0) as avg_days
      FROM onboarding_plans op
      LEFT JOIN tasks t ON op.id = t.plan_id
      WHERE op.csm_email = ANY(${csmEmails}::text[])
      AND NOT EXISTS (
        SELECT 1 FROM tasks WHERE plan_id = op.id AND status != 'complete'
      )
      AND EXISTS (
        SELECT 1 FROM tasks WHERE plan_id = op.id 
        AND status = 'complete' AND completed_at >= ${startDate.toISOString()}
      )
      GROUP BY op.id
    `;

    // On-Time Completion Rate
    const onTimeResult = await sql`
      SELECT 
        COUNT(DISTINCT CASE 
          WHEN op.go_live_date IS NOT NULL 
          AND MAX(t.completed_at) <= op.go_live_date 
          THEN op.id 
        END)::float / NULLIF(COUNT(DISTINCT op.id), 0) * 100 as percentage
      FROM onboarding_plans op
      LEFT JOIN tasks t ON op.id = t.plan_id
      WHERE op.csm_email = ANY(${csmEmails}::text[])
      AND NOT EXISTS (
        SELECT 1 FROM tasks WHERE plan_id = op.id AND status != 'complete'
      )
      AND EXISTS (
        SELECT 1 FROM tasks WHERE plan_id = op.id 
        AND status = 'complete' AND completed_at >= ${startDate.toISOString()}
      )
    `;

    // Total Blocked Tasks
    const blockedTasksResult = await sql`
      SELECT COUNT(*) as count
      FROM tasks t
      WHERE t.status = 'blocked'
      AND t.plan_id IN (
        SELECT id FROM onboarding_plans WHERE csm_email = ANY(${csmEmails}::text[])
      )
    `;

    // Plans At Risk (overdue, stalled, or 2+ blocked)
    const atRiskResult = await sql`
      SELECT COUNT(DISTINCT op.id) as count
      FROM onboarding_plans op
      WHERE op.csm_email = ANY(${csmEmails}::text[])
      AND (
        (op.go_live_date IS NOT NULL AND op.go_live_date < NOW() AND EXISTS (
          SELECT 1 FROM tasks WHERE plan_id = op.id AND status != 'complete'
        ))
        OR (SELECT COUNT(*) FROM tasks WHERE plan_id = op.id AND status = 'blocked') >= 2
        OR (SELECT MAX(created_at) FROM tasks WHERE plan_id = op.id) < NOW() - INTERVAL '5 days'
      )
    `;

    // Average Customer Engagement (% of customer tasks completed)
    const customerEngagementResult = await sql`
      SELECT 
        COALESCE(AVG(
          CASE WHEN total_customer_tasks > 0 
          THEN (completed_customer_tasks::float / total_customer_tasks) * 100
          ELSE 0 END
        ), 0) as percentage
      FROM (
        SELECT 
          op.id,
          COUNT(CASE WHEN t.assigned_to = 'customer' THEN 1 END) as total_customer_tasks,
          COUNT(CASE WHEN t.assigned_to = 'customer' AND t.status = 'complete' THEN 1 END) as completed_customer_tasks
        FROM onboarding_plans op
        LEFT JOIN tasks t ON op.id = t.plan_id
        WHERE op.csm_email = ANY(${csmEmails}::text[])
        GROUP BY op.id
      ) sub
      WHERE total_customer_tasks > 0
    `;

    // Customer Response Rate (plans with at least 1 customer task completed)
    const responseRateResult = await sql`
      SELECT 
        COUNT(DISTINCT CASE WHEN customer_completed > 0 THEN op.id END)::float / 
        NULLIF(COUNT(DISTINCT op.id), 0) * 100 as percentage
      FROM onboarding_plans op
      LEFT JOIN (
        SELECT plan_id, COUNT(*) as customer_completed
        FROM tasks
        WHERE assigned_to = 'customer' AND status = 'complete'
        GROUP BY plan_id
      ) ct ON op.id = ct.plan_id
      WHERE op.csm_email = ANY(${csmEmails}::text[])
    `;

    return NextResponse.json({
      activePlans: {
        current: activePlansResult[0]?.count || 0,
        trend: (completedThisPeriodResult[0]?.count || 0) > (completedPreviousPeriodResult[0]?.count || 0) ? "up" : "down"
      },
      completedThisPeriod: {
        current: completedThisPeriodResult[0]?.count || 0,
        trend: (completedThisPeriodResult[0]?.count || 0) > (completedPreviousPeriodResult[0]?.count || 0) ? "up" : "down"
      },
      avgDuration: {
        current: Math.round(avgDurationResult[0]?.avg_days || 0),
        trend: "stable"
      },
      onTimeRate: {
        current: Math.round(onTimeResult[0]?.percentage || 0),
        status: (onTimeResult[0]?.percentage || 0) > 70 ? "good" : (onTimeResult[0]?.percentage || 0) > 50 ? "warning" : "danger"
      },
      blockedTasks: {
        current: blockedTasksResult[0]?.count || 0,
        trend: "neutral"
      },
      atRiskPlans: {
        current: atRiskResult[0]?.count || 0,
        trend: "neutral"
      },
      customerEngagement: {
        current: Math.round(customerEngagementResult[0]?.percentage || 0),
        trend: "neutral"
      },
      customerResponseRate: {
        current: Math.round(responseRateResult[0]?.percentage || 0),
        trend: "neutral"
      }
    });
  } catch (error) {
    console.error("Analytics summary error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

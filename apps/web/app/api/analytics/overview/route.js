import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      console.error("[Analytics Overview] User not found or no organizationId:", user);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendorId = user.organizationId;
    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get("days") || "30";

    // Calculate safe date parameter (parameterized, not string interpolation)
    const daysNum = days === "all" ? 3650 : parseInt(days) || 30;
    const sinceDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();

    // Get total active plans
    const totalActivePlans = await sql`
      SELECT COUNT(*) as count FROM onboarding_plans
      WHERE vendor_id = ${vendorId} 
      AND stage != 'completed' 
      AND stage != 'archived'
    `;

    // Get average completion percentage
    const avgCompletion = await sql`
      SELECT COALESCE(AVG(COALESCE(completion_percentage, 0)), 0) as avg_completion
      FROM onboarding_plans
      WHERE vendor_id = ${vendorId}
    `;

    // Get at-risk plans (low completion + old)
    const atRiskPlans = await sql`
      SELECT COUNT(*) as count FROM onboarding_plans
      WHERE vendor_id = ${vendorId}
      AND completion_percentage < 30 
      AND created_at < NOW() - INTERVAL '14 days'
      AND stage != 'completed'
    `;

    // Get completed plans in period
    const completedThisPeriod = await sql`
      SELECT COUNT(*) as count FROM onboarding_plans
      WHERE vendor_id = ${vendorId}
      AND stage = 'completed' 
      AND updated_at > ${sinceDate}
    `;

    // Get new plans in period
    const newPlansThisPeriod = await sql`
      SELECT COUNT(*) as count FROM onboarding_plans
      WHERE vendor_id = ${vendorId}
      AND created_at > ${sinceDate}
    `;

    // Get total and completed tasks
    const taskStats = await sql`
      SELECT 
        COUNT(*) as total_tasks,
        COALESCE(SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END), 0) as completed_tasks
      FROM tasks t
      JOIN onboarding_plans p ON t.plan_id = p.id
      WHERE p.vendor_id = ${vendorId}
    `;

    const totalTasks = taskStats[0]?.total_tasks || 0;
    const completedTasks = taskStats[0]?.completed_tasks || 0;
    const taskCompletionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

    return NextResponse.json({
      total_active_plans: totalActivePlans[0]?.count || 0,
      avg_completion_percentage: parseFloat(avgCompletion[0]?.avg_completion || 0).toFixed(1),
      at_risk_count: atRiskPlans[0]?.count || 0,
      completed_this_period: completedThisPeriod[0]?.count || 0,
      new_plans_this_period: newPlansThisPeriod[0]?.count || 0,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      task_completion_rate: parseFloat(taskCompletionRate)
    });
  } catch (error) {
    console.error("[Analytics Overview] Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

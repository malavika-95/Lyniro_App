import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      console.error("[Analytics Stage Performance] User not found or no organizationId:", user);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendorId = user.organizationId;

    // Get all stages used by this vendor's templates
    const stages = await sql`
      SELECT DISTINCT 
        ts.id,
        ts.name as stage_name,
        ts.stage_number,
        t.id as template_id
      FROM template_stages ts
      JOIN templates t ON ts.template_id = t.id
      WHERE t.vendor_id = ${vendorId}
      ORDER BY ts.stage_number ASC
    `;

    const stagePerformance = [];

    for (const stage of stages) {
      // Count plans currently in this stage
      const currentPlans = await sql`
        SELECT COUNT(*) as count
        FROM onboarding_plans p
        WHERE p.vendor_id = ${vendorId}
        AND p.stage_id = ${stage.id}
        AND p.stage != 'completed'
      `;

      // Get completion rate for this stage
      const completionStats = await sql`
        SELECT 
          COUNT(DISTINCT p.id) as total_plans,
          COALESCE(SUM(CASE WHEN p.stage_id > ${stage.id} THEN 1 ELSE 0 END), 0) as completed_count
        FROM onboarding_plans p
        WHERE p.vendor_id = ${vendorId}
        AND p.template_id = ${stage.template_id}
      `;

      const totalPlans = completionStats[0]?.total_plans || 0;
      const completedCount = completionStats[0]?.completed_count || 0;
      const completionRate = totalPlans > 0 ? ((completedCount / totalPlans) * 100).toFixed(1) : 0;

      // Calculate average days to complete
      const avgDays = await sql`
        SELECT 
          COALESCE(AVG(EXTRACT(DAY FROM (p.updated_at - p.created_at))), 0) as avg_days
        FROM onboarding_plans p
        WHERE p.vendor_id = ${vendorId}
        AND p.stage_id = ${stage.id}
        AND p.stage_id IS NOT NULL
      `;

      stagePerformance.push({
        stage_name: stage.stage_name,
        avg_days_to_complete: parseInt(avgDays[0]?.avg_days || 0),
        completion_rate: parseFloat(completionRate),
        plans_currently_in_stage: currentPlans[0]?.count || 0
      });
    }

    return NextResponse.json(stagePerformance);
  } catch (error) {
    console.error("[Analytics Stage Performance] Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

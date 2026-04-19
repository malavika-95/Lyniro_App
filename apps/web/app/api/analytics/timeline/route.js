import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      console.error("[Analytics Timeline] User not found or no organizationId:", user);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendorId = user.organizationId;
    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get("days") || "30";

    // Calculate safe date parameter (parameterized, not string interpolation)
    const daysNum = days === "all" ? 3650 : parseInt(days) || 30;
    const sinceDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();

    // Get timeline data for the period
    const timelineData = await sql`
      SELECT 
        DATE(date_point) as date,
        COALESCE(SUM(new_plans), 0) as new_plans,
        COALESCE(SUM(completed_tasks), 0) as completed_tasks
      FROM (
        SELECT 
          DATE(created_at) as date_point,
          COUNT(*) as new_plans,
          0 as completed_tasks
        FROM onboarding_plans
        WHERE vendor_id = ${vendorId}
        AND created_at > ${sinceDate}
        GROUP BY DATE(created_at)
        
        UNION ALL
        
        SELECT 
          DATE(t.completed_at) as date_point,
          0 as new_plans,
          COUNT(*) as completed_tasks
        FROM tasks t
        JOIN onboarding_plans p ON t.plan_id = p.id
        WHERE p.vendor_id = ${vendorId}
        AND t.status = 'complete'
        AND t.completed_at > ${sinceDate}
        GROUP BY DATE(t.completed_at)
      ) combined
      GROUP BY DATE(date_point)
      ORDER BY date ASC
    `;

    // Format response
    const timeline = timelineData.map(row => ({
      date: row.date.toISOString().split('T')[0], // YYYY-MM-DD format
      new_plans: parseInt(row.new_plans || 0),
      completed_tasks: parseInt(row.completed_tasks || 0)
    }));

    return NextResponse.json(timeline);
  } catch (error) {
    console.error("[Analytics Timeline] Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

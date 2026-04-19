import { getCurrentUser } from "@/lib/session-utils";
import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get subscription info
    const subscription = await sql`
      SELECT tier, plan_limit
      FROM vendor_subscriptions
      WHERE vendor_id = ${user.organizationId}
    `;

    if (!subscription[0]) {
      return NextResponse.json({
        success: true,
        data: {
          tier: "free",
          plans: {
            limit: 3,
            current: 0,
            usagePercent: 0
          }
        }
      });
    }

    // Get active plans count
    const plansResult = await sql`
      SELECT COUNT(*) as count
      FROM onboarding_plans
      WHERE vendor_id = ${user.organizationId}
      AND stage != 'completed'
    `;

    const currentPlans = plansResult[0]?.count || 0;
    const limit = subscription[0].plan_limit || 3;
    const usagePercent = limit > 0 ? Math.round((currentPlans / limit) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        tier: subscription[0].tier,
        plans: {
          limit,
          current: currentPlans,
          usagePercent
        }
      }
    });
  } catch (error) {
    console.error("[Subscription Stats] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to load subscription stats",
        data: {
          tier: "free",
          plans: {
            limit: 3,
            current: 0,
            usagePercent: 0
          }
        }
      },
      { status: 500 }
    );
  }
}

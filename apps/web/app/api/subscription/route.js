import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";

const TIER_LIMITS = {
  free: 3,
  starter: 10,
  growth: 50,
  scale: 999999
};

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get subscription
    const subscription = await sql`
      SELECT tier, plan_limit FROM vendor_subscriptions 
      WHERE vendor_id = ${user.organizationId}
    `;

    if (!subscription[0]) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Count active plans
    const planCount = await sql`
      SELECT COUNT(*) as count FROM onboarding_plans 
      WHERE vendor_id = ${user.organizationId} 
      AND stage != 'completed'
    `;

    const currentCount = planCount[0]?.count || 0;
    const tier = subscription[0].tier;
    const limit = TIER_LIMITS[tier] || 3;
    const remaining = Math.max(0, limit - currentCount);

    return NextResponse.json({
      tier,
      limit,
      currentCount,
      remaining,
      utilizationPercent: Math.round((currentCount / limit) * 100)
    });
  } catch (error) {
    console.error("[Subscription] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

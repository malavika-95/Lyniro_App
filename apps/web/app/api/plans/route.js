import { getPlans, createPlan } from "@/lib/services/plan-service";
import { getCurrentUser } from "@/lib/session-utils";
import { requireAuth, requireRole, getVendorId } from "@/lib/rbac";
import { sendNotification } from "@/lib/notifications";
import { canCreatePlan, incrementActivePlans } from "@/lib/services/subscription-service";
import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log('[Plans] GET /api/plans - Attempting to get current user');
    const user = await getCurrentUser();
    console.log('[Plans] Current user:', { userId: user.userId, email: user.email, organizationId: user.organizationId, role: user.role });
    
    requireAuth(user);
    console.log('[Plans] Auth check passed');

    // Pass org context to service (org boundary enforced in query)
    console.log('[Plans] Fetching plans for org:', user.organizationId, 'role:', user.role, 'userId:', user.userId);
    const plans = await getPlans(user.organizationId, user.role, user.userId);
    console.log('[Plans] Found', plans.length, 'plans');

    // Enrich with task counts for dashboard
    const enrichedPlans = await Promise.all(plans.map(async (plan) => {
      const taskStats = await sql`
        SELECT 
          COUNT(*) as taskcount,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedcount,
          COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blockedcount
        FROM tasks
        WHERE plan_id = ${plan.id}
      `;
      
      const stats = taskStats[0] || { taskcount: 0, completedcount: 0, blockedcount: 0 };
      return {
        ...plan,
        taskCount: parseInt(stats.taskcount || 0),
        completedCount: parseInt(stats.completedcount || 0),
        blockedCount: parseInt(stats.blockedcount || 0)
      };
    }));

    return NextResponse.json({
      success: true,
      data: enrichedPlans
    });
  } catch (error) {
    console.error("[Plans] Error:", error.message);
    console.error("[Plans] Error Stack:", error.stack);
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch plans",
        details: error.stack
      },
      { status: statusCode }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    requireAuth(user);
    requireRole(user, ["OWNER", "MANAGER", "MEMBER"]);

    const { customer_name, company_name, customer_email, template_id } = await request.json();

    // ENFORCE: Check plan limit before creating
    const vendorId = getVendorId(user);
    const canCreate = await canCreatePlan(vendorId);

    if (!canCreate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: canCreate.message,
          code: canCreate.code,
          subscription: {
            current: canCreate.current,
            limit: canCreate.limit
          }
        },
        { status: 403 }
      );
    }

    const newPlan = await createPlan({
      customer_name,
      company_name,
      customer_email,
      template_id,
      vendor_id: vendorId  // CRITICAL: Always store vendor_id
    });

    // INCREMENT active plans count
    try {
      await incrementActivePlans(vendorId);
    } catch (subError) {
      console.error("[Plans] Subscription update error:", subError);
    }

    // Send plan created notification
    try {
      await sendNotification("plan_created", newPlan.id, { 
        customerName: customer_name,
        customerEmail: customer_email
      });
    } catch (notifError) {
      console.error("[Plans] Notification error:", notifError);
    }

    return NextResponse.json({
      success: true,
      data: newPlan
    });
  } catch (error) {
    console.error("[Plans] Error:", error.message);
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create plan"
      },
      { status: statusCode }
    );
  }
}

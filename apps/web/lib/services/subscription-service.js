import sql from "@/app/api/utils/sql";
import { logActivity } from "@/app/api/utils/activity-log";

/**
 * Check if a vendor can create a new plan based on subscription tier
 * @param {number} vendorId - The vendor ID
 * @returns {Promise<{allowed: boolean, message: string, code: string, current: number, limit: number}>}
 */
export async function canCreatePlan(vendorId) {
  try {
    if (!vendorId) {
      return {
        allowed: false,
        message: "Vendor ID is required",
        code: "INVALID_VENDOR",
        current: 0,
        limit: 0,
      };
    }

    // Get subscription details
    const subscription = await sql`
      SELECT tier, plan_limit 
      FROM vendor_subscriptions 
      WHERE vendor_id = ${vendorId}
    `;

    // Default to free tier if no subscription found
    const tier = subscription?.[0]?.tier || "free";
    const planLimit = subscription?.[0]?.plan_limit || 3;

    // Count active plans (not completed)
    const plansResult = await sql`
      SELECT COUNT(*) as count 
      FROM onboarding_plans 
      WHERE vendor_id = ${vendorId} 
        AND stage != 'completed'
    `;

    const currentPlans = parseInt(plansResult?.[0]?.count || 0);

    // Check if vendor can create another plan
    const allowed = currentPlans < planLimit;

    let message = "";
    let code = "";

    if (allowed) {
      message = `You can create ${planLimit - currentPlans} more plan(s) on the ${tier} tier`;
      code = "PLAN_ALLOWED";
    } else {
      if (tier === "free") {
        message = `Free tier limited to 3 plans. Upgrade to Pro for unlimited plans`;
        code = "PLAN_LIMIT_FREE";
      } else if (tier === "pro") {
        message = `Pro tier limited to ${planLimit} plans. Contact sales for enterprise limits`;
        code = "PLAN_LIMIT_PRO";
      } else {
        message = `Plan limit reached for ${tier} tier`;
        code = "PLAN_LIMIT_EXCEEDED";
      }
    }

    return {
      allowed,
      message,
      code,
      current: currentPlans,
      limit: planLimit,
    };
  } catch (error) {
    console.error("[subscription-service] canCreatePlan error:", error);
    return {
      allowed: false,
      message: "Error checking subscription limits",
      code: "SUBSCRIPTION_CHECK_ERROR",
      current: 0,
      limit: 0,
    };
  }
}

/**
 * Increment active plans count for a vendor
 * Note: active_plans_count is a derived metric based on active (non-completed) plans
 * This function validates the count is accurate
 * @param {number} vendorId - The vendor ID
 * @returns {Promise<{success: boolean, message: string, count: number}>}
 */
export async function incrementActivePlans(vendorId) {
  try {
    if (!vendorId) {
      throw new Error("Vendor ID is required");
    }

    // Count current active plans
    const plansResult = await sql`
      SELECT COUNT(*) as count 
      FROM onboarding_plans 
      WHERE vendor_id = ${vendorId} 
        AND stage != 'completed'
    `;

    const activeCount = parseInt(plansResult?.[0]?.count || 0);

    // Update active_plans_count in csm_users if they have a CSM user
    const csmUser = await sql`
      SELECT id 
      FROM csm_users 
      WHERE vendor_id = ${vendorId}
      LIMIT 1
    `;

    if (csmUser?.[0]?.id) {
      await sql`
        UPDATE csm_users 
        SET active_plans_count = ${activeCount}
        WHERE id = ${csmUser[0].id}
      `;
    }

    return {
      success: true,
      message: "Active plans count updated",
      count: activeCount,
    };
  } catch (error) {
    console.error("[subscription-service] incrementActivePlans error:", error);
    return {
      success: false,
      message: `Error incrementing active plans: ${error.message}`,
      count: 0,
    };
  }
}

/**
 * Get detailed subscription information for a vendor
 * @param {number} vendorId - The vendor ID
 * @returns {Promise<{tier: string, planLimit: number, createdAt: Date, updatedAt: Date}|null>}
 */
export async function getSubscriptionDetails(vendorId) {
  try {
    const subscription = await sql`
      SELECT tier, plan_limit, created_at, updated_at 
      FROM vendor_subscriptions 
      WHERE vendor_id = ${vendorId}
    `;

    if (!subscription?.[0]) {
      // Return default free tier
      return {
        tier: "free",
        planLimit: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return {
      tier: subscription[0].tier || "free",
      planLimit: subscription[0].plan_limit || 3,
      createdAt: subscription[0].created_at,
      updatedAt: subscription[0].updated_at,
    };
  } catch (error) {
    console.error("[subscription-service] getSubscriptionDetails error:", error);
    throw error;
  }
}

/**
 * Check if a vendor has access to a specific feature based on tier
 * @param {number} vendorId - The vendor ID
 * @param {string} feature - Feature name (e.g., 'custom_templates', 'api_keys', 'custom_domain')
 * @returns {Promise<boolean>}
 */
export async function hasFeatureAccess(vendorId, feature) {
  try {
    const subscription = await getSubscriptionDetails(vendorId);
    const tier = subscription.tier;

    const features = {
      free: ["basic_templates", "messages", "notes"],
      pro: [
        "basic_templates",
        "custom_templates",
        "messages",
        "notes",
        "api_keys",
        "team_members",
      ],
      enterprise: [
        "basic_templates",
        "custom_templates",
        "messages",
        "notes",
        "api_keys",
        "team_members",
        "custom_domain",
        "sso",
        "webhooks",
      ],
    };

    const tierFeatures = features[tier] || features.free;
    return tierFeatures.includes(feature);
  } catch (error) {
    console.error("[subscription-service] hasFeatureAccess error:", error);
    return false;
  }
}

/**
 * Upgrade or create a subscription for a vendor
 * @param {number} vendorId - The vendor ID
 * @param {string} tier - Subscription tier ('free', 'pro', 'enterprise')
 * @param {number} planLimit - Maximum number of plans allowed
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function upgradeSubscription(vendorId, tier, planLimit) {
  try {
    if (!vendorId || !tier) {
      throw new Error("Vendor ID and tier are required");
    }

    // Validate tier
    const validTiers = ["free", "pro", "enterprise"];
    if (!validTiers.includes(tier)) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    // Check if subscription exists
    const existing = await sql`
      SELECT id FROM vendor_subscriptions WHERE vendor_id = ${vendorId}
    `;

    if (existing?.[0]) {
      // Update existing
      await sql`
        UPDATE vendor_subscriptions 
        SET tier = ${tier}, plan_limit = ${planLimit}, updated_at = NOW()
        WHERE vendor_id = ${vendorId}
      `;
    } else {
      // Create new
      await sql`
        INSERT INTO vendor_subscriptions (vendor_id, tier, plan_limit, created_at, updated_at)
        VALUES (${vendorId}, ${tier}, ${planLimit}, NOW(), NOW())
      `;
    }

    return {
      success: true,
      message: `Subscription upgraded to ${tier}`,
    };
  } catch (error) {
    console.error("[subscription-service] upgradeSubscription error:", error);
    throw error;
  }
}

export default {
  canCreatePlan,
  incrementActivePlans,
  getSubscriptionDetails,
  hasFeatureAccess,
  upgradeSubscription,
};

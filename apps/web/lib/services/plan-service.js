import sql from "@/app/api/utils/sql";
import { logActivity } from "@/app/api/utils/activity-log";

/**
 * Centralized plan service - all plan DB logic here
 * CRITICAL: Enforces vendor isolation and role-based access control
 * All functions use parameterized SQL to prevent injection
 * All functions throw errors with statusCode property for route handlers
 */

/**
 * Get onboarding plans with strict role-based access control
 * OWNER: sees all plans in their vendor (organization)
 * MANAGER: sees plans assigned to their direct reports + their own plans
 * MEMBER: sees only their own plans
 * @param {number} organizationId - The vendor_id (organization boundary)
 * @param {string} role - User role (OWNER, MANAGER, MEMBER)
 * @param {number} userId - The CSM user ID
 * @returns {Array} Plans visible to the user
 * @throws {Error} If organizationId is invalid
 */
export async function getPlans(organizationId, role, userId) {
  // Validate inputs
  if (!organizationId) {
    const error = new Error("Organization ID required");
    error.statusCode = 400;
    throw error;
  }

  if (!role || !["OWNER", "MANAGER", "MEMBER"].includes(role)) {
    const error = new Error("Invalid role");
    error.statusCode = 400;
    throw error;
  }

  // CRITICAL: All queries MUST filter by vendor_id for multi-tenant safety
  // Ensure organizationId is string since vendor_id is stored as text
  const vendorId = String(organizationId);
  let query;

  if (role === "OWNER") {
    // OWNER sees all plans in their organization
    query = sql`
      SELECT 
        op.id,
        op.customer_name,
        op.company_name,
        op.customer_email,
        op.csm_email,
        op.vendor_id,
        op.stage,
        op.go_live_date,
        op.created_at,
        op.template_id,
        op.magic_link_created_at,
        op.magic_link_expires_at,
        cu.id as csm_id,
        cu.first_name as csm_first_name,
        cu.last_name as csm_last_name
      FROM onboarding_plans op
      LEFT JOIN csm_users cu ON cu.email = op.csm_email
      WHERE op.vendor_id = ${vendorId}
      ORDER BY op.created_at DESC
    `;
  } else if (role === "MANAGER") {
    // MANAGER sees plans assigned to their direct reports + their own
    query = sql`
      SELECT 
        op.id,
        op.customer_name,
        op.company_name,
        op.customer_email,
        op.csm_email,
        op.vendor_id,
        op.stage,
        op.go_live_date,
        op.created_at,
        op.template_id,
        op.magic_link_created_at,
        op.magic_link_expires_at,
        cu.id as csm_id,
        cu.first_name as csm_first_name,
        cu.last_name as csm_last_name
      FROM onboarding_plans op
      LEFT JOIN csm_users cu ON cu.email = op.csm_email
      WHERE op.vendor_id = ${vendorId}
        AND (
          cu.manager_id = ${userId}
          OR cu.id = ${userId}
        )
      ORDER BY op.created_at DESC
    `;
  } else {
    // MEMBER sees only their own plans
    query = sql`
      SELECT 
        op.id,
        op.customer_name,
        op.company_name,
        op.customer_email,
        op.csm_email,
        op.vendor_id,
        op.stage,
        op.go_live_date,
        op.created_at,
        op.template_id,
        op.magic_link_created_at,
        op.magic_link_expires_at,
        cu.id as csm_id,
        cu.first_name as csm_first_name,
        cu.last_name as csm_last_name
      FROM onboarding_plans op
      LEFT JOIN csm_users cu ON cu.email = op.csm_email
      WHERE op.vendor_id = ${vendorId}
        AND cu.id = ${userId}
      ORDER BY op.created_at DESC
    `;
  }

  return await query;
}

/**
 * Get a single plan with strict organization boundary check
 * Applies same role-based access control as getPlans
 * @param {number} planId - The plan ID
 * @param {number} organizationId - The vendor_id (organization boundary)
 * @param {string} role - User role (OWNER, MANAGER, MEMBER)
 * @param {number} userId - The CSM user ID
 * @returns {Object} The plan with CSM details
 * @throws {Error} If plan not found, access denied, or org boundary violated
 */
export async function getPlan(planId, organizationId, role, userId) {
  // Validate inputs
  if (!planId) {
    const error = new Error("Plan ID required");
    error.statusCode = 400;
    throw error;
  }

  if (!organizationId) {
    const error = new Error("Organization ID required");
    error.statusCode = 400;
    throw error;
  }

  if (!role || !["OWNER", "MANAGER", "MEMBER"].includes(role)) {
    const error = new Error("Invalid role");
    error.statusCode = 400;
    throw error;
  }

  // Ensure organizationId is string since vendor_id is stored as text
  const vendorId = String(organizationId);

  // STEP 1: Fetch plan with vendor boundary check
  const planResult = await sql`
    SELECT 
      op.id,
      op.customer_name,
      op.company_name,
      op.customer_email,
      op.csm_email,
      op.vendor_id,
      op.stage,
      op.go_live_date,
      op.created_at,
      op.template_id,
      op.magic_link_created_at,
      op.magic_link_expires_at,
      cu.id as csm_id,
      cu.first_name as csm_first_name,
      cu.last_name as csm_last_name,
      cu.manager_id
    FROM onboarding_plans op
    LEFT JOIN csm_users cu ON cu.email = op.csm_email
    WHERE op.id = ${planId}
      AND op.vendor_id = ${vendorId}
  `;

  // Plan not found or org boundary violated
  if (!planResult[0]) {
    const error = new Error("Plan not found");
    error.statusCode = 404;
    throw error;
  }

  const plan = planResult[0];

  // STEP 2: Check role-based access (same logic as getPlans)
  let hasAccess = false;

  if (role === "OWNER") {
    // OWNER always has access (already filtered by vendor_id)
    hasAccess = true;
  } else if (role === "MANAGER") {
    // MANAGER can access if plan is assigned to their direct reports or themselves
    hasAccess = plan.csm_id === userId || plan.manager_id === userId;
  } else if (role === "MEMBER") {
    // MEMBER can only access their own plans
    hasAccess = plan.csm_id === userId;
  }

  if (!hasAccess) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  return plan;
}

/**
 * Create a new onboarding plan
 * Automatically logs plan creation activity
 * @param {Object} planData - Plan data to insert
 *   - customer_name (required)
 *   - company_name (required)
 *   - customer_email (required)
 *   - template_id (optional)
 *   - vendor_id (required - ALWAYS from auth context, never from user input)
 * @returns {Object} The newly created plan
 * @throws {Error} If validation fails or insert fails
 */
export async function createPlan(planData) {
  const {
    customer_name,
    company_name,
    customer_email,
    template_id,
    vendor_id
  } = planData;

  // Validate required fields
  if (!customer_name?.trim()) {
    const error = new Error("Customer name required");
    error.statusCode = 400;
    throw error;
  }

  if (!company_name?.trim()) {
    const error = new Error("Company name required");
    error.statusCode = 400;
    throw error;
  }

  if (!customer_email?.trim()) {
    const error = new Error("Customer email required");
    error.statusCode = 400;
    throw error;
  }

  if (!vendor_id) {
    const error = new Error("Vendor ID required");
    error.statusCode = 400;
    throw error;
  }

  // Create the plan
  const result = await sql`
    INSERT INTO onboarding_plans (
      customer_name,
      company_name,
      customer_email,
      template_id,
      vendor_id,
      created_at
    ) VALUES (
      ${customer_name},
      ${company_name},
      ${customer_email},
      ${template_id ? parseInt(template_id) : null},
      ${vendor_id},
      CURRENT_TIMESTAMP
    )
    RETURNING 
      id,
      customer_name,
      company_name,
      customer_email,
      template_id,
      vendor_id,
      stage,
      created_at
  `;

  const newPlan = result[0];

  // Log the activity (non-blocking)
  try {
    await logActivity(newPlan.id, null, "plan_created", {
      planId: newPlan.id,
      customerName: customer_name,
      customerEmail: customer_email,
      templateId: template_id || null
    });
  } catch (logError) {
    console.error("[Plan Service] Activity log error:", logError);
    // Don't throw - logging shouldn't break the main action
  }

  return newPlan;
}

import sql from "@/app/api/utils/sql";

/**
 * Custom error class for authorization failures
 */
export class AuthError extends Error {
  constructor(message, statusCode = 403) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Validate that a user is authenticated
 * @param {Object} user - User object
 * @throws {AuthError} If user is not authenticated
 */
export function requireAuth(user) {
  if (!user || (!user.id && !user.userId) || !user.email) {
    throw new AuthError("Unauthorized", 401);
  }
  return user;
}

/**
 * Validate that a user has one of the allowed roles
 * @param {Object} user - User object
 * @param {string[]} allowedRoles - Array of allowed roles (e.g., ['OWNER', 'MANAGER'])
 * @throws {AuthError} If user's role is not allowed
 */
export function requireRole(user, allowedRoles) {
  if (!user || !user.role || !allowedRoles.includes(user.role)) {
    throw new AuthError("Insufficient permissions", 403);
  }
  return user;
}

/**
 * Validate that a user has access to a specific plan
 * @param {Object} user - User object
 * @param {number} planId - Plan ID
 * @throws {AuthError} If user doesn't have access to the plan
 */
export async function requirePlanAccess(user, planId) {
  requireAuth(user);

  // Fetch plan and validate organization access
  const plan = await sql`
    SELECT id, vendor_id 
    FROM onboarding_plans 
    WHERE id = ${planId}
  `;

  if (!plan || plan.length === 0) {
    throw new AuthError("Plan not found", 404);
  }

  const planRecord = plan[0];

  // Validate organization access (convert to int for comparison)
  if (parseInt(planRecord.vendor_id) !== parseInt(user.organizationId)) {
    throw new AuthError("Access denied", 403);
  }

  // Role-based access control
  if (user.role === "OWNER") {
    // OWNER can access any plan in their organization
    return planRecord;
  }

  if (user.role === "MANAGER") {
    // MANAGER can access all plans in their organization
    // (In the future, can add manager_id check if needed)
    return planRecord;
  }

  if (user.role === "MEMBER") {
    // MEMBER can access any plan in their organization
    // (In the future, can add assignment check if needed)
    return planRecord;
  }

  throw new AuthError("Invalid role", 403);
}

/**
 * Validate that a user can impersonate another user
 * @param {Object} user - Current user (impersonator)
 * @param {number} targetUserId - Target user ID to impersonate
 * @returns {Promise<Object>} Target user object
 * @throws {AuthError} If user doesn't have impersonation access
 */
export async function requireImpersonateAccess(user, targetUserId) {
  requireAuth(user);

  // Only OWNER and MANAGER can impersonate
  if (!["OWNER", "MANAGER"].includes(user.role)) {
    console.error(`[RBAC] User role ${user.role} not in [OWNER, MANAGER]`);
    throw new AuthError("Insufficient permissions", 403);
  }

  // Fetch target user
  const targetUserQuery = await sql`
    SELECT id, email, first_name, last_name, role, vendor_id, manager_id 
    FROM csm_users 
    WHERE id = ${targetUserId}
  `;

  if (!targetUserQuery || targetUserQuery.length === 0) {
    console.error(`[RBAC] Target user ${targetUserId} not found`);
    throw new AuthError("Target user not found", 404);
  }

  const targetUser = targetUserQuery[0];

  // Validate target is in the same organization (convert both to int for comparison)
  const targetVendorId = parseInt(targetUser.vendor_id);
  const userVendorId = parseInt(user.organizationId);
  
  if (targetVendorId !== userVendorId) {
    console.error(`[RBAC] Org mismatch: target ${targetVendorId} != user ${userVendorId}`);
    throw new AuthError("Cannot impersonate user from different organization", 403);
  }

  // MANAGER can only impersonate their direct reports
  if (user.role === "MANAGER" && targetUser.manager_id !== user.userId) {
    console.error(`[RBAC] Manager ${user.userId} cannot impersonate ${targetUserId} (manager_id=${targetUser.manager_id})`);
    throw new AuthError("Can only impersonate your direct reports", 403);
  }

  return targetUser;
}

/**
 * Get vendor ID from user object
 * @param {Object} user - User object
 * @returns {number} Vendor ID (organization ID)
 */
export function getVendorId(user) {
  if (!user || !user.organizationId) {
    throw new AuthError("Unauthorized", 401);
  }
  return user.organizationId;
}

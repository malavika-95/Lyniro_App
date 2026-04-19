import { cookies } from "next/headers";
import sql from "@/app/api/utils/sql";

const VENDOR_SESSION_COOKIE = "csm-session";
const CLIENT_SESSION_COOKIE = "client-session";
const VENDOR_IMPERSONATE_COOKIE = "vendor-impersonate";

export class SessionError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Get current user from session cookies
 * Validates session against database
 * Returns: { userId, email, name, role, organizationId, sessionType, impersonatingAs }
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  
  // Check vendor (CSM) session first
  const vendorSessionCookie = cookieStore.get(VENDOR_SESSION_COOKIE)?.value;
  if (vendorSessionCookie) {
    try {
      // Handle both formats: just sessionUUID or userId:sessionUUID
      const vendorSessionUUID = vendorSessionCookie.includes(":") 
        ? vendorSessionCookie.split(":")[1] 
        : vendorSessionCookie;

      const session = await sql`
        SELECT s.csm_user_id, s.session_uuid, s.expires_at, u.id, u.email, u.first_name, u.last_name, u.role, u.vendor_id, u.manager_id, u.impersonated_by_id
        FROM csm_sessions s
        JOIN csm_users u ON s.csm_user_id = u.id
        WHERE s.session_uuid = ${vendorSessionUUID}
        AND s.expires_at > NOW()
      `;

      if (session.length === 0) {
        throw new SessionError("Session expired", 401);
      }

      const user = session[0];
      const impersonating = cookieStore.get(VENDOR_IMPERSONATE_COOKIE)?.value;

      return {
        userId: user.id,
        email: user.email,
        name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        role: user.role ? user.role.toUpperCase() : null,
        organizationId: user.vendor_id,
        sessionType: "vendor",
        managerOf: user.manager_id ? [user.manager_id] : [],
        impersonatingAs: impersonating || null,
        impersonatedBy: user.impersonated_by_id || null,
      };
    } catch (error) {
      if (error instanceof SessionError) throw error;
      console.error("[getCurrentUser] vendor session error:", error);
      throw new SessionError("Invalid session", 401);
    }
  }

  // Check client (customer) session
  const clientSessionToken = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  if (clientSessionToken) {
    try {
      const session = await sql`
        SELECT s."userId", s."expiresAt", u.id, u.email, u.name
        FROM session s
        JOIN "user" u ON s."userId" = u.id
        WHERE s.token = ${clientSessionToken}
        AND s."expiresAt" > NOW()
      `;

      if (session.length === 0) {
        throw new SessionError("Session expired", 401);
      }

      const user = session[0];
      return {
        userId: user.id,
        email: user.email,
        name: user.name || "",
        role: "client",
        organizationId: null,
        sessionType: "client",
        impersonatingAs: null,
      };
    } catch (error) {
      if (error instanceof SessionError) throw error;
      console.error("[getCurrentUser] client session error:", error);
      throw new SessionError("Invalid session", 401);
    }
  }

  throw new SessionError("No active session", 401);
}

/**
 * Set vendor (CSM) session cookie
 */
export async function setVendorSessionCookie(sessionUUID, maxAgeSeconds = 86400 * 7) {
  const cookieStore = await cookies();
  cookieStore.set(VENDOR_SESSION_COOKIE, sessionUUID, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAgeSeconds,
    path: "/",
  });
}

/**
 * Set client (customer) session cookie
 */
export async function setClientSessionCookie(sessionToken, maxAgeSeconds = 86400 * 7) {
  const cookieStore = await cookies();
  cookieStore.set(CLIENT_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAgeSeconds,
    path: "/",
  });
}

/**
 * Set vendor impersonation cookie
 * tracks which user is being impersonated
 */
export async function setVendorImpersonateCookie(targetUserId) {
  const cookieStore = await cookies();
  cookieStore.set(VENDOR_IMPERSONATE_COOKIE, String(targetUserId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400 * 7, // 7 days
    path: "/",
  });
}

/**
 * Clear vendor session cookie
 */
export async function clearVendorSession() {
  const cookieStore = await cookies();
  cookieStore.delete(VENDOR_SESSION_COOKIE);
  cookieStore.delete(VENDOR_IMPERSONATE_COOKIE);
}

/**
 * Clear client session cookie
 */
export async function clearClientSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CLIENT_SESSION_COOKIE);
}

/**
 * Clear all session cookies
 */
export async function clearAllSessions() {
  const cookieStore = await cookies();
  cookieStore.delete(VENDOR_SESSION_COOKIE);
  cookieStore.delete(CLIENT_SESSION_COOKIE);
  cookieStore.delete(VENDOR_IMPERSONATE_COOKIE);
}

/**
 * Validate session is still active and return user
 * Same as getCurrentUser but can be called with existing user context
 */
export async function validateSession(sessionUUID, sessionType = "vendor") {
  if (sessionType === "vendor") {
    const session = await sql`
      SELECT s.csm_user_id, s.expires_at
      FROM csm_sessions s
      WHERE s.session_uuid = ${sessionUUID}
      AND s.expires_at > NOW()
    `;
    return session.length > 0;
  }

  if (sessionType === "client") {
    const session = await sql`
      SELECT s.token, s.expiresAt
      FROM session
      WHERE s.token = ${sessionUUID}
      AND s.expiresAt > NOW()
    `;
    return session.length > 0;
  }

  return false;
}

/**
 * Update last_active_at for vendor session
 */
export async function updateVendorSessionActivity(sessionUUID) {
  try {
    await sql`
      UPDATE csm_sessions
      SET last_active_at = NOW()
      WHERE session_uuid = ${sessionUUID}
    `;
  } catch (error) {
    console.error("[updateVendorSessionActivity] error:", error);
    // Non-blocking, don't throw
  }
}

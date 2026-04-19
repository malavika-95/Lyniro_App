import sql from "@/app/api/utils/sql";
import { getCurrentUser, setVendorSessionCookie } from "@/lib/session-utils";
import { requireAuth, requireImpersonateAccess, AuthError } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

/**
 * STRICT impersonation endpoint
 * - Only OWNER or MANAGER
 * - Same organization only
 * - Cannot impersonate across organizations
 * - Creates a NEW session for the impersonated user
 */
export async function POST(request) {
  try {
    const { targetUserId } = await request.json();
    
    if (!targetUserId) {
      throw new AuthError("targetUserId is required", 400);
    }

    const user = await getCurrentUser();

    // Check auth and role
    requireAuth(user);

    // Check impersonation permission (CRITICAL: checks org boundaries)
    const target = await requireImpersonateAccess(user, targetUserId);

    // Create a NEW session for the target user (not just a cookie flag)
    const sessionUUID = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store the current (owner) session before switching
    const { cookies: cookieStore } = await import("next/headers");
    const cStore = await cookieStore();
    const currentSession = cStore.get('vendor-session')?.value;

    // Insert session into csm_sessions table with impersonation flag
    await sql`
      INSERT INTO csm_sessions (csm_user_id, session_uuid, ip_address, user_agent, created_at, expires_at, last_active_at)
      VALUES (${target.id}, ${sessionUUID}, '0.0.0.0', 'impersonate', NOW(), ${expiresAt}, NOW())
    `;

    // Set the session cookie to the TARGET user's session
    await setVendorSessionCookie(sessionUUID);

    // Store original session in a separate cookie for switch-back
    if (currentSession) {
      cStore.set('original-vendor-session', currentSession, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 // 24 hours
      });
    }

    return NextResponse.json({
      success: true,
      impersonating: {
        id: target.id,
        userId: target.id,
        role: target.role,
        email: target.email
      },
      impersonatedBy: {
        id: user.userId,
        role: user.role
      }
    });
  } catch (error) {
    console.error("[Impersonate] Error:", error.message);
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to impersonate user"
      },
      { status: statusCode }
    );
  }
}

/**
 * End impersonation session - switch back to original vendor user
 */
export async function DELETE(request) {
  try {
    const { getCurrentUser } = await import("@/lib/session-utils");
    const user = await getCurrentUser();
    
    if (!user.impersonatedBy) {
      throw new AuthError("Not currently impersonating", 400);
    }

    // Get the current impersonated user ID
    const impersonatedUserId = user.userId;

    // Clear the impersonated_by_id flag in the database
    await sql`
      UPDATE csm_users
      SET impersonated_by_id = NULL
      WHERE id = ${impersonatedUserId}
    `;

    // Fetch the original user's most recent session from the database
    const originalSession = await sql`
      SELECT session_uuid FROM csm_sessions
      WHERE csm_user_id = ${user.impersonatedBy}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!originalSession || originalSession.length === 0) {
      throw new AuthError("Original session not found", 404);
    }

    // Set the vendor session cookie back to the original
    const { setVendorSessionCookie } = await import("@/lib/session-utils");
    await setVendorSessionCookie(originalSession[0].session_uuid);

    // Clear any client session
    const { clearClientSession } = await import("@/lib/session-utils");
    await clearClientSession();

    return NextResponse.json({
      success: true,
      message: "Switched back to original account"
    });
  } catch (error) {
    console.error("[Impersonate] DELETE Error:", error.message);
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to end impersonation"
      },
      { status: statusCode }
    );
  }
}
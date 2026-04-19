import { validateVendorCredentials, createStandardSession } from "@/lib/auth-service";
import { setVendorSessionCookie } from "@/lib/session-utils";
import { enforceRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import sql from "@/app/api/utils/sql";

/**
 * STRICT vendor login with rate limiting
 */
export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // ENFORCE rate limiting - IP-based (prevent brute force)
    try {
      enforceRateLimit(request, RATE_LIMITS.LOGIN, "vendor-login");
    } catch (rateLimitError) {
      return NextResponse.json(
        { 
          success: false, 
          error: rateLimitError.message
        },
        { status: 429 }
      );
    }

    // Validate credentials using centralized auth service
    const user = await validateVendorCredentials(email, password);

    // Create standardized session
    const session = createStandardSession(user);

    // Generate session UUID
    const sessionUUID = randomUUID();

    // Insert session into database
    await sql`
      INSERT INTO csm_sessions (
        csm_user_id, 
        session_uuid, 
        ip_address,
        user_agent,
        expires_at, 
        created_at, 
        last_active_at
      ) VALUES (
        ${user.userId}, 
        ${sessionUUID},
        ${request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'},
        ${request.headers.get('user-agent') || 'unknown'},
        ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;

    // Set session cookie with UUID
    await setVendorSessionCookie(sessionUUID);

    return NextResponse.json({
      success: true,
      data: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId
      }
    });
  } catch (error) {
    console.error("[Vendor Login] Error:", error.message);
    const statusCode = error.statusCode || 401;

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Login failed"
      },
      { status: statusCode }
    );
  }
}
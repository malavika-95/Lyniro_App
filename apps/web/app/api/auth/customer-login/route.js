import { validateClientCredentials, createStandardSession } from "@/lib/auth-service";
import { setClientSessionCookie } from "@/lib/session-utils";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/**
 * STRICT client login with rate limiting
 */
export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // ENFORCE rate limiting - IP-based (prevent brute force)
    try {
      enforceRateLimit(request, RATE_LIMITS.LOGIN, "customer-login");
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
    const user = await validateClientCredentials(email, password);

    // Create standardized session
    const session = createStandardSession(user);

    // Set session cookie
    await setClientSessionCookie(user.userId);

    return NextResponse.json({
      success: true,
      data: {
        userId: user.userId,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      }
    });
  } catch (error) {
    console.error("[Client Login] Error:", error.message);
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

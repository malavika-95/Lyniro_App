import sql from "@/app/api/utils/sql";
import { getCurrentUser, setClientSessionCookie } from "@/lib/session-utils";
import { requireAuth, AuthError } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

/**
 * Impersonate a client/customer
 * - Only OWNER or MANAGER can impersonate clients
 * - Creates a proper client session for the impersonated customer
 */
export async function POST(request) {
  try {
    const { targetCustomerId } = await request.json();
    
    if (!targetCustomerId) {
      return NextResponse.json(
        { success: false, error: "targetCustomerId is required" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    requireAuth(user);

    // Only OWNER and MANAGER can impersonate
    if (!["OWNER", "MANAGER"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Fetch the customer/client
    const customers = await sql`
      SELECT id, email, plan_id FROM customers WHERE id = ${parseInt(targetCustomerId)}
    `;

    if (!customers || customers.length === 0) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = customers[0];
    
    // Get or create a user record for the customer
    let users = await sql`
      SELECT id FROM "user" WHERE email = ${customer.email}
    `;

    let userId;
    if (users && users.length > 0) {
      userId = users[0].id;
    } else {
      userId = uuidv4();
      try {
        await sql`
          INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
          VALUES (${userId}, ${customer.email}, ${customer.email}, true, NOW(), NOW())
        `;
      } catch (err) {
        // User might have been created concurrently, fetch again
        const retry = await sql`SELECT id FROM "user" WHERE email = ${customer.email}`;
        if (retry && retry.length > 0) {
          userId = retry[0].id;
        } else {
          throw err;
        }
      }
    }

    // Create session in the database
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionId = uuidv4();

    await sql`
      INSERT INTO session (id, "userId", token, "expiresAt", "ipAddress", "userAgent", "createdAt", "updatedAt")
      VALUES (${sessionId}, ${userId}, ${sessionToken}, ${expiresAt}, '0.0.0.0', 'impersonate', NOW(), NOW())
    `;

    // Store original vendor user ID in cookie so they can switch back
    const cookieStore = await (await import("next/headers")).cookies();
    cookieStore.set('original-vendor-session', user.userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400 * 7,
      path: "/",
    });
    
    // Set the client session cookie
    await setClientSessionCookie(sessionToken);

    return NextResponse.json({
      success: true,
      message: "Impersonation successful"
    });
  } catch (error) {
    console.error("[Impersonate Client] POST Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to impersonate customer"
      },
      { status: 500 }
    );
  }
}

/**
 * End client impersonation - switch back to vendor user
 */
export async function DELETE(request) {
  try {
    const { setVendorSessionCookie, clearClientSession } = await import("@/lib/session-utils");
    const user = await getCurrentUser();
    
    if (user.sessionType !== "client") {
      return NextResponse.json(
        { success: false, error: "Not impersonating a client" },
        { status: 400 }
      );
    }

    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const originalVendorSession = cookieStore.get('original-vendor-session')?.value;

    if (!originalVendorSession) {
      return NextResponse.json(
        { success: false, error: "No original vendor session found" },
        { status: 400 }
      );
    }

    // Set the vendor session cookie back to the original
    await setVendorSessionCookie(originalVendorSession);

    // Clear the client session
    await clearClientSession();

    return NextResponse.json({
      success: true,
      message: "Switched back to vendor account"
    });
  } catch (error) {
    console.error("[Impersonate Client] DELETE Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to end client impersonation"
      },
      { status: 500 }
    );
  }
}

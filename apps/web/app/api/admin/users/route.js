import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    let user;
    try {
      user = await getCurrentUser();
    } catch (error) {
      console.error("[Admin Users] Session error:", error.message);
      return NextResponse.json(
        { error: "Unauthorized", details: error.message },
        { status: 401 }
      );
    }

    if (!user || user.sessionType !== "vendor") {
      console.error("[Admin Users] User not vendor session:", user);
      return NextResponse.json(
        { error: "Unauthorized - not a vendor session" },
        { status: 401 }
      );
    }

    // Only owners can view all users
    if (user.role?.toLowerCase() !== "owner") {
      console.error("[Admin Users] User not owner:", user.role);
      return NextResponse.json(
        { error: "Forbidden - owner access required" },
        { status: 403 }
      );
    }

    // vendorId might be a string or integer, ensure it's consistent
    const vendorIdValue = user.organizationId;
    console.log(`[Admin Users] Fetching users for vendor ${vendorIdValue}`);

    // Get all csm_users in this organization
    const users = await sql`
      SELECT 
        id,
        email,
        first_name,
        last_name,
        role,
        status,
        created_at
      FROM csm_users
      WHERE vendor_id = ${vendorIdValue}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(users);
  } catch (error) {
    console.error("[Admin Users] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    let user;
    try {
      user = await getCurrentUser();
    } catch (error) {
      console.error("[Admin Clients] Session error:", error.message);
      return NextResponse.json(
        { error: "Unauthorized", details: error.message },
        { status: 401 }
      );
    }

    if (!user || user.sessionType !== "vendor") {
      console.error("[Admin Clients] User not vendor session:", user);
      return NextResponse.json(
        { error: "Unauthorized - not a vendor session" },
        { status: 401 }
      );
    }

    // Only owners can view all clients
    if (user.role?.toLowerCase() !== "owner") {
      console.error("[Admin Clients] User not owner:", user.role);
      return NextResponse.json(
        { error: "Forbidden - owner access required" },
        { status: 403 }
      );
    }

    const vendorIdValue = user.organizationId;
    console.log(`[Admin Clients] Fetching clients for vendor ${vendorIdValue}`);

    // Get all customers belonging to plans owned by this vendor
    const clients = await sql`
      SELECT DISTINCT
        c.id,
        c.email,
        c.created_at,
        op.customer_name as name,
        op.id as plan_id,
        op.customer_name as plan_name
      FROM customers c
      INNER JOIN onboarding_plans op ON c.plan_id = op.id
      WHERE op.vendor_id = ${String(vendorIdValue)}
      ORDER BY op.customer_name ASC, c.created_at DESC
    `;

    return NextResponse.json(clients);
  } catch (error) {
    console.error("[Admin Clients] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

import { getCurrentUser, clearClientSession } from "@/lib/session-utils";
import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== "client") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch customer's plan_id from the customers table
    let planId = null;
    try {
      const customerData = await sql`
        SELECT plan_id FROM customers WHERE id = ${parseInt(user.userId)}
      `;
      if (customerData && customerData.length > 0) {
        planId = customerData[0].plan_id;
      }
    } catch (err) {
      console.warn("[Customer Session] Could not fetch plan_id:", err);
    }

    return NextResponse.json({
      userId: user.userId,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      plan_id: planId
    });
  } catch (error) {
    console.error("[Customer Session] Error:", error);
    return NextResponse.json(
      { error: "Session error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    await clearClientSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Customer Logout] Error:", error);
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
  }
}

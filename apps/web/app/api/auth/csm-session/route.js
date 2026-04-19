import { getCurrentUser, clearVendorSession } from "@/lib/session-utils";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        impersonatedBy: user.impersonatedBy
      }
    });
  } catch (error) {
    console.error("[CSM Session] Error:", error);
    return NextResponse.json(
      { success: false, error: "Session error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const vendorSession = cookieStore.get("csm-session")?.value;
    
    if (vendorSession) {
      // Handle both formats: just sessionUUID or userId:sessionUUID
      const sessionUUID = vendorSession.includes(":") ? vendorSession.split(":")[1] : vendorSession;
      if (sessionUUID) {
        // Delete session record from database
        await sql`
          DELETE FROM csm_sessions 
          WHERE session_uuid = ${sessionUUID}
        `;
      }
    }
    
    await clearVendorSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CSM Logout] Error:", error);
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
  }
}

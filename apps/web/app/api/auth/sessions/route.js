import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";
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

    // Get all active sessions for this user
    const sessions = await sql`
      SELECT 
        id, 
        ip_address, 
        user_agent, 
        created_at, 
        last_active_at, 
        expires_at
      FROM csm_sessions
      WHERE csm_user_id = ${user.userId}
      AND expires_at > NOW()
      ORDER BY last_active_at DESC
    `;

    return NextResponse.json({
      success: true,
      data: sessions.map(session => ({
        id: session.id,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        createdAt: session.created_at,
        lastActiveAt: session.last_active_at,
        expiresAt: session.expires_at
      }))
    });
  } catch (error) {
    console.error("[Sessions] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

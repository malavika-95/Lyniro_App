import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { sessionId } = await params;

    // Verify the session belongs to the current user
    const session = await sql`
      SELECT id FROM csm_sessions 
      WHERE id = ${parseInt(sessionId)} 
      AND csm_user_id = ${user.userId}
    `;

    if (!session[0]) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    // Delete the session
    await sql`
      DELETE FROM csm_sessions 
      WHERE id = ${parseInt(sessionId)}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Sessions Delete] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to revoke session" },
      { status: 500 }
    );
  }
}

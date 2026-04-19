import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    // Get current password hash
    const userData = await sql`SELECT password_hash FROM csm_users WHERE id = ${user.userId}`;
    if (!userData[0]?.password_hash) {
      return NextResponse.json({ error: "Unable to verify password" }, { status: 500 });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, userData[0].password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await sql`
      UPDATE csm_users 
      SET password_hash = ${hashedPassword},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${user.userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}

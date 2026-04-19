import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.sessionType !== "client") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    // CRITICAL: Enforce minimum 8 character password
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Get current password hash
    const customerData = await sql`
      SELECT password_hash FROM customers WHERE id = ${user.userId}
    `;

    if (!customerData[0] || !customerData[0].password_hash) {
      return NextResponse.json({ error: "Unable to verify password" }, { status: 500 });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, customerData[0].password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await sql`
      UPDATE customers 
      SET password_hash = ${hashedPassword}
      WHERE id = ${user.userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}

import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // Mark token as used
    await sql`
      UPDATE email_tokens
      SET used_at = NOW()
      WHERE token = ${token}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking token as used:", error);
    return NextResponse.json(
      { error: "Error marking token as used" },
      { status: 500 }
    );
  }
}

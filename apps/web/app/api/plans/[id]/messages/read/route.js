import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Plan ID is required' }, { status: 400 });
    }

    const planId = parseInt(id);

    // Mark all unread CSM messages as read
    const result = await sql`
      UPDATE messages
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE plan_id = ${planId} AND sender_type = 'csm' AND is_read = false
      RETURNING id
    `;

    return NextResponse.json({ success: true, data: { updated: result.length } });
  } catch (error) {
    const errorMsg = error?.message || String(error);
    console.error('Failed to mark messages as read:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const statusRecord = await sql`
      SELECT status
      FROM csm_availability_status
      WHERE csm_id = ${user.userId}
    `;

    const status = statusRecord[0]?.status || 'available';
    return NextResponse.json({ status });
  } catch (error) {
    console.error('Failed to fetch status:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { status } = await request.json();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!['available', 'away', 'do_not_disturb'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Upsert availability status
    const result = await sql`
      INSERT INTO csm_availability_status (csm_id, status, updated_at)
      VALUES (${user.userId}, ${status}, NOW())
      ON CONFLICT (csm_id) 
      DO UPDATE SET status = ${status}, updated_at = NOW()
      RETURNING status
    `;

    return NextResponse.json({ status: result[0].status });
  } catch (error) {
    console.error('Failed to update status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

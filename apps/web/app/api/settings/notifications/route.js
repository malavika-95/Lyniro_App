import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const settings = await sql`SELECT email_on_blocked_task, email_on_completion, daily_summary_email FROM notification_settings WHERE csm_id = ${user.userId}`;
    return NextResponse.json(settings[0] || { email_on_blocked_task: true, email_on_completion: true, daily_summary_email: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { blockedTask, completion, dailySummary } = await request.json();
    const settings = await sql`
      UPDATE notification_settings 
      SET email_on_blocked_task = ${blockedTask}, 
          email_on_completion = ${completion},
          daily_summary_email = ${dailySummary},
          updated_at = CURRENT_TIMESTAMP
      WHERE csm_id = ${user.userId}
      RETURNING email_on_blocked_task, email_on_completion, daily_summary_email
    `;
    return NextResponse.json(settings[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

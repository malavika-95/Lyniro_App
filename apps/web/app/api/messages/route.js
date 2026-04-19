import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get authenticated user from session
    const user = await getCurrentUser();
    
    // Check authentication
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Only vendors can access messages
    if (user.sessionType !== "vendor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all conversations for this vendor, sorted by most recent
    const conversations = await sql`
      SELECT 
        op.id,
        op.customer_name,
        op.company_name,
        m.content as last_message,
        m.created_at as last_message_time,
        COUNT(CASE WHEN m.sender_type = 'customer' AND m.is_read = FALSE THEN 1 END) as unread_count,
        COALESCE(MAX(CASE WHEN m.sender_type = 'customer' AND m.is_read = FALSE THEN 1 ELSE 0 END), 0) as has_unread
      FROM onboarding_plans op
      WHERE op.vendor_id = ${user.organizationId}
      LEFT JOIN messages m ON op.id = m.plan_id
      GROUP BY op.id, op.customer_name, op.company_name, m.content, m.created_at
      ORDER BY m.created_at DESC NULLS LAST
    `;

    // Get the most recent message for each plan
    const plansWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await sql`
          SELECT content, created_at, sender_type
          FROM messages
          WHERE plan_id = ${conv.id}
          ORDER BY created_at DESC
          LIMIT 1
        `;
        return {
          ...conv,
          last_message: lastMessage[0]?.content || 'No messages yet',
          last_message_time: lastMessage[0]?.created_at || null,
          sender_type: lastMessage[0]?.sender_type
        };
      })
    );

    return NextResponse.json(plansWithMessages);
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

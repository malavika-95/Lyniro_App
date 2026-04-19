import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only owners can view audit logs
    if (user.role?.toLowerCase() !== "owner") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const vendorIdValue = user.organizationId;

    // Get impersonation audit log entries
    const auditLog = await sql`
      SELECT 
        id,
        action,
        created_at,
        metadata
      FROM activity_log
      WHERE action IN ('impersonation_started', 'impersonation_ended')
      AND metadata->>'organization_id' = ${String(vendorIdValue)}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    // Transform the data to be more readable
    const transformedLog = auditLog.map(entry => {
      const meta = entry.metadata || {};
      return {
        id: entry.id,
        action: entry.action,
        impersonator_id: meta.impersonator_id,
        impersonator_role: meta.impersonator_role,
        target_user_id: meta.target_user_id,
        target_role: meta.target_role,
        created_at: entry.created_at
      };
    });

    // Enrich with user names
    if (transformedLog.length > 0) {
      const userIds = new Set();
      transformedLog.forEach(entry => {
        if (entry.impersonator_id) userIds.add(entry.impersonator_id);
        if (entry.target_user_id) userIds.add(entry.target_user_id);
      });

      if (userIds.size > 0) {
        const users = await sql`
          SELECT id, first_name, last_name, email
          FROM csm_users
          WHERE id = ANY(${Array.from(userIds)}::integer[])
        `;

        const userMap = {};
        users.forEach(u => {
          userMap[u.id] = `${u.first_name} ${u.last_name}`;
        });

        transformedLog.forEach(entry => {
          if (entry.impersonator_id) {
            entry.impersonator_name = userMap[entry.impersonator_id] || 'Unknown';
          }
          if (entry.target_user_id) {
            entry.target_name = userMap[entry.target_user_id] || 'Unknown';
          }
        });
      }
    }

    return NextResponse.json(transformedLog);
  } catch (error) {
    console.error("[Admin Audit Log] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit log" },
      { status: 500 }
    );
  }
}

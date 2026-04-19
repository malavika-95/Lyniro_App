import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session-utils";

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - owner or manager
    if (!['owner', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: "Only owners and managers can update sender preferences" }, { status: 403 });
    }

    const {
      email_send_mode,
      email_display_name,
      email_from_local_part,
      individual_display_name
    } = await request.json();

    const vendorId = user.organizationId;
    const userId = user.userId;

    // Validate email_from_local_part if provided
    if (email_from_local_part) {
      const localPartRegex = /^[a-z0-9._+-]+$/;
      if (!localPartRegex.test(email_from_local_part)) {
        return NextResponse.json({
          error: "Invalid email prefix. Use only lowercase letters, numbers, dots, hyphens, or underscores."
        }, { status: 400 });
      }
    }

    // Update vendors table
    if (email_send_mode || email_display_name || email_from_local_part) {
      const updates = [];
      const params = [];

      if (email_send_mode) {
        updates.push('email_send_mode = $' + (params.length + 1));
        params.push(email_send_mode);
      }
      if (email_display_name) {
        updates.push('email_display_name = $' + (params.length + 1));
        params.push(email_display_name);
      }
      if (email_from_local_part) {
        updates.push('email_from_local_part = $' + (params.length + 1));
        params.push(email_from_local_part);
      }

      if (updates.length > 0) {
        params.push(vendorId);
        await sql`UPDATE vendors SET ${updates.join(', ')} WHERE id = $${params.length}`;
      }
    }

    // Update csm_users with individual display name
    if (individual_display_name && userId) {
      await sql`
        UPDATE csm_users 
        SET email_display_name = ${individual_display_name}
        WHERE id = ${userId}
      `;
    }

    // Get updated settings
    const vendorSettings = await sql`
      SELECT 
        email_send_mode,
        email_display_name,
        email_from_local_part
      FROM vendors
      WHERE id = ${vendorId}
    `;

    const userSettings = await sql`
      SELECT email_display_name
      FROM csm_users
      WHERE id = ${userId}
    `;

    const settings = vendorSettings[0] || {};
    const user_display = userSettings[0]?.email_display_name || null;

    return NextResponse.json({
      success: true,
      data: {
        email_send_mode: settings.email_send_mode || 'company',
        email_display_name: settings.email_display_name || null,
        email_from_local_part: settings.email_from_local_part || 'noreply',
        individual_display_name: user_display
      }
    });
  } catch (error) {
    console.error('[Sender Preferences]', error);
    return NextResponse.json({ error: "Failed to update sender preferences" }, { status: 500 });
  }
}

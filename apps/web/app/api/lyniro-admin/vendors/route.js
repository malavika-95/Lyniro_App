import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-session-utils';
import sql from '@/app/api/utils/sql';

export async function GET(request) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const vendors = await sql`
      SELECT 
        v.id,
        v.name,
        v.created_at,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT p.id) as plan_count,
        vs.tier,
        vs.plan_limit,
        (SELECT email FROM csm_users WHERE vendor_id = v.id AND role = 'owner' LIMIT 1) as owner_email,
        (SELECT MAX(created_at) FROM onboarding_plans WHERE vendor_id = v.id) as last_activity
      FROM vendors v
      LEFT JOIN csm_users u ON u.vendor_id = v.id
      LEFT JOIN onboarding_plans p ON p.vendor_id = v.id
      LEFT JOIN vendor_subscriptions vs ON vs.vendor_id = v.id
      GROUP BY v.id, v.name, v.created_at, vs.tier, vs.plan_limit
      ORDER BY v.created_at DESC
    `;

    // Log action
    await sql`
      INSERT INTO lyniro_audit_log (admin_id, admin_email, action)
      VALUES (${admin.adminId}, ${admin.email}, 'viewed_vendor_list')
    `;

    return NextResponse.json({
      success: true,
      vendors
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

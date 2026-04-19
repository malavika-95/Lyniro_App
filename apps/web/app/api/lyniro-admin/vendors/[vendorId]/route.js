import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-session-utils';
import sql from '@/app/api/utils/sql';

export async function GET(request, { params }) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { vendorId } = await params;
    const vendorIdNum = parseInt(vendorId);

    // Get vendor info
    const vendor = await sql`
      SELECT v.*, vs.tier, vs.plan_limit
      FROM vendors v
      LEFT JOIN vendor_subscriptions vs ON vs.vendor_id = v.id
      WHERE v.id = ${vendorIdNum}
    `;

    if (vendor.length === 0) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Get CSM users for this vendor
    const users = await sql`
      SELECT 
        cu.id,
        cu.email,
        cu.first_name,
        cu.last_name,
        cu.role,
        cu.status,
        cu.created_at,
        (SELECT MAX(created_at) FROM csm_sessions WHERE csm_user_id = cu.id) as last_login
      FROM csm_users cu
      WHERE cu.vendor_id = ${vendorIdNum}
      ORDER BY cu.created_at DESC
    `;

    // Get plans for this vendor
    const plans = await sql`
      SELECT 
        id,
        customer_name,
        company_name,
        stage,
        go_live_date,
        created_at,
        (
          SELECT COUNT(*)::float / NULLIF(
            (SELECT COUNT(*) FROM template_tasks WHERE stage_id IN (
              SELECT id FROM template_stages WHERE template_id = (
                SELECT template_id FROM onboarding_plans WHERE id = op.id
              )
            )), 0
          ) * 100
          FROM tasks WHERE plan_id = op.id AND status = 'completed'
        ) as completion_percentage
      FROM onboarding_plans op
      WHERE vendor_id = ${vendorIdNum}
      ORDER BY created_at DESC
    `;

    // Get activity log
    const activityLog = await sql`
      SELECT *
      FROM activity_log
      WHERE plan_id IN (SELECT id FROM onboarding_plans WHERE vendor_id = ${vendorIdNum})
      ORDER BY created_at DESC
      LIMIT 20
    `;

    // Log action
    await sql`
      INSERT INTO lyniro_audit_log (admin_id, admin_email, action, target_type, target_id)
      VALUES (${admin.adminId}, ${admin.email}, 'viewed_vendor_detail', 'vendor', ${vendorIdNum})
    `;

    return NextResponse.json({
      success: true,
      vendor: vendor[0],
      users,
      plans,
      activityLog
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor details' },
      { status: 500 }
    );
  }
}

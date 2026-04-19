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

    const url = new URL(request.url);
    const adminIdFilter = url.searchParams.get('adminId');

    let query;

    if (adminIdFilter) {
      query = await sql`
        SELECT 
          lal.id,
          lal.admin_id,
          lal.admin_email,
          la.first_name,
          la.last_name,
          lal.action,
          lal.target_type,
          lal.target_id,
          lal.target_email,
          lal.metadata,
          lal.ip_address,
          lal.created_at
        FROM lyniro_audit_log lal
        LEFT JOIN lyniro_admins la ON la.id = lal.admin_id
        WHERE lal.admin_id = ${parseInt(adminIdFilter)}
        ORDER BY lal.created_at DESC
        LIMIT 100
      `;
    } else {
      query = await sql`
        SELECT 
          lal.id,
          lal.admin_id,
          lal.admin_email,
          la.first_name,
          la.last_name,
          lal.action,
          lal.target_type,
          lal.target_id,
          lal.target_email,
          lal.metadata,
          lal.ip_address,
          lal.created_at
        FROM lyniro_audit_log lal
        LEFT JOIN lyniro_admins la ON la.id = lal.admin_id
        ORDER BY lal.created_at DESC
        LIMIT 100
      `;
    }

    return NextResponse.json({
      success: true,
      auditLog: query
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}

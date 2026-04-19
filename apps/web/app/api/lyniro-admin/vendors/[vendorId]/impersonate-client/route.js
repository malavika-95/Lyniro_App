import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-session-utils';
import sql from '@/app/api/utils/sql';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

export async function POST(request, { params }) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { vendorId } = await params;
    const { customerId } = await request.json();
    const vendorIdNum = parseInt(vendorId);
    const customerIdNum = parseInt(customerId);

    // Verify customer belongs to a plan owned by this vendor
    const customer = await sql`
      SELECT c.id, c.email
      FROM customers c
      JOIN onboarding_plans op ON op.id = c.plan_id
      WHERE c.id = ${customerIdNum} AND op.vendor_id = ${vendorIdNum}
    `;

    if (customer.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const targetCustomer = customer[0];

    // Create customer session
    const sessionUUID = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO session (userId, token, expiresAt)
      VALUES (${customerIdNum}, ${sessionUUID}, ${expiresAt})
    `;

    // Set customer session cookie
    const cookieStore = await cookies();
    cookieStore.set('customer-session', `${customerIdNum}:${sessionUUID}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/'
    });

    // Log action
    await sql`
      INSERT INTO lyniro_audit_log (
        admin_id,
        admin_email,
        action,
        target_type,
        target_id,
        target_email
      )
      VALUES (
        ${admin.adminId},
        ${admin.email},
        'impersonated_client',
        'customer',
        ${customerIdNum},
        ${targetCustomer.email}
      )
    `;

    return NextResponse.json({
      success: true,
      redirectTo: '/customer'
    });
  } catch (error) {
    console.error('Client impersonation error:', error);
    return NextResponse.json(
      { error: 'Impersonation failed' },
      { status: 500 }
    );
  }
}

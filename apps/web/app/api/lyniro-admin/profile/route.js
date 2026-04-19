import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-session-utils';

export async function GET(request) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: admin.adminId,
      email: admin.email,
      first_name: admin.firstName,
      last_name: admin.lastName,
      role: admin.role
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile', details: error.message },
      { status: 500 }
    );
  }
}

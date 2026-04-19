import { NextResponse } from 'next/server';
import { authenticateApiKey, hasPermission } from '@/lib/api-auth';
import sql from '@/app/api/utils/sql';

function createResponse(success, data = null, error = null) {
  const response = { success };
  if (data !== null) response.data = data;
  if (error) response.error = error;
  return response;
}

function createHeaders(remaining = 99) {
  return {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': remaining.toString(),
    'X-Lyniro-Version': '1.0',
    'Content-Type': 'application/json'
  };
}

export async function GET(request, { params }) {
  try {
    const auth = await authenticateApiKey(request);

    if (auth.status) {
      const headers = createHeaders();
      if (auth.headers) {
        Object.assign(headers, auth.headers);
      }
      return NextResponse.json(
        createResponse(false, null, { code: 'UNAUTHORIZED', message: auth.error }),
        { status: auth.status, headers }
      );
    }

    if (!hasPermission(auth, 'tasks:read')) {
      return NextResponse.json(
        createResponse(false, null, { code: 'FORBIDDEN', message: 'You do not have permission to read tasks' }),
        { status: 403, headers: createHeaders() }
      );
    }

    const { id } = await params;

    // Verify plan belongs to vendor
    const plan = await sql`
      SELECT id FROM onboarding_plans WHERE id = ${parseInt(id)} AND vendor_id = ${auth.vendorId}
    `;

    if (!plan[0]) {
      return NextResponse.json(
        createResponse(false, null, { code: 'NOT_FOUND', message: 'Plan not found' }),
        { status: 404, headers: createHeaders() }
      );
    }

    // Get tasks for this plan
    const tasks = await sql`
      SELECT 
        id,
        title as task_name,
        status,
        assigned_to,
        created_at as due_date,
        stage_id
      FROM tasks 
      WHERE plan_id = ${parseInt(id)}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(
      createResponse(true, tasks),
      { status: 200, headers: createHeaders() }
    );
  } catch (error) {
    console.error('[API V1 Tasks GET] Error:', error);
    return NextResponse.json(
      createResponse(false, null, { code: 'SERVER_ERROR', message: 'Internal server error' }),
      { status: 500, headers: createHeaders() }
    );
  }
}

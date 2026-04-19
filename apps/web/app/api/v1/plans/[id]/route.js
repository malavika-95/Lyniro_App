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

    if (!hasPermission(auth, 'plans:read')) {
      return NextResponse.json(
        createResponse(false, null, { code: 'FORBIDDEN', message: 'You do not have permission to read plans' }),
        { status: 403, headers: createHeaders() }
      );
    }

    const { id } = await params;

    // Get plan and verify it belongs to this vendor
    const plan = await sql`
      SELECT * FROM onboarding_plans WHERE id = ${parseInt(id)} AND vendor_id = ${auth.vendorId}
    `;

    if (!plan[0]) {
      return NextResponse.json(
        createResponse(false, null, { code: 'NOT_FOUND', message: 'Plan not found' }),
        { status: 404, headers: createHeaders() }
      );
    }

    // Get stages and tasks
    const stages = await sql`
      SELECT * FROM template_stages 
      WHERE template_id = ${plan[0].template_id}
      ORDER BY position ASC
    `;

    const planData = {
      ...plan[0],
      stages: await Promise.all(
        stages.map(async (stage) => {
          const tasks = await sql`
            SELECT * FROM template_tasks WHERE stage_id = ${stage.id} ORDER BY position ASC
          `;
          return { ...stage, tasks };
        })
      )
    };

    return NextResponse.json(
      createResponse(true, planData),
      { status: 200, headers: createHeaders() }
    );
  } catch (error) {
    console.error('[API V1 Plan GET] Error:', error);
    return NextResponse.json(
      createResponse(false, null, { code: 'SERVER_ERROR', message: 'Internal server error' }),
      { status: 500, headers: createHeaders() }
    );
  }
}

export async function PATCH(request, { params }) {
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

    if (!hasPermission(auth, 'plans:write')) {
      return NextResponse.json(
        createResponse(false, null, { code: 'FORBIDDEN', message: 'You do not have permission to update plans' }),
        { status: 403, headers: createHeaders() }
      );
    }

    const { id } = await params;
    const { stage, go_live_date } = await request.json();

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

    if (!stage && !go_live_date) {
      return NextResponse.json(
        createResponse(false, null, { code: 'VALIDATION_ERROR', message: 'No updates provided' }),
        { status: 400, headers: createHeaders() }
      );
    }

    let result;
    if (stage && go_live_date) {
      result = await sql`
        UPDATE onboarding_plans 
        SET stage = ${stage}, go_live_date = ${go_live_date}
        WHERE id = ${parseInt(id)}
        RETURNING *
      `;
    } else if (stage) {
      result = await sql`
        UPDATE onboarding_plans 
        SET stage = ${stage}
        WHERE id = ${parseInt(id)}
        RETURNING *
      `;
    } else {
      result = await sql`
        UPDATE onboarding_plans 
        SET go_live_date = ${go_live_date}
        WHERE id = ${parseInt(id)}
        RETURNING *
      `;
    }

    return NextResponse.json(
      createResponse(true, result[0]),
      { status: 200, headers: createHeaders() }
    );
  } catch (error) {
    console.error('[API V1 Plan PATCH] Error:', error);
    return NextResponse.json(
      createResponse(false, null, { code: 'SERVER_ERROR', message: 'Internal server error' }),
      { status: 500, headers: createHeaders() }
    );
  }
}

import { NextResponse } from 'next/server';
import { authenticateApiKey, hasPermission } from '@/lib/api-auth';
import sql from '@/app/api/utils/sql';

function createResponse(success, data = null, error = null, meta = null) {
  const response = { success };
  if (data !== null) response.data = data;
  if (error) response.error = error;
  if (meta) response.meta = meta;
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

export async function GET(request) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const stage = searchParams.get('stage');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Build query
    let whereClause = `WHERE op.vendor_id = ${auth.vendorId}`;
    if (stage) {
      whereClause += ` AND op.stage = '${stage}'`;
    }
    if (search) {
      whereClause += ` AND (op.company_name ILIKE '%${search}%' OR op.customer_name ILIKE '%${search}%')`;
    }

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total FROM onboarding_plans op
      ${whereClause}
    `;

    // Get paginated results
    const plans = await sql`
      SELECT 
        id,
        customer_name,
        company_name,
        stage,
        created_at,
        go_live_date
      FROM onboarding_plans op
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Calculate completion percentage for each plan
    const plansWithCompletion = await Promise.all(
      plans.map(async (plan) => {
        const taskStats = await sql`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
          FROM tasks WHERE plan_id = ${plan.id}
        `;
        
        const total = taskStats[0].total || 0;
        const completed = taskStats[0].completed || 0;
        const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          ...plan,
          completion_percentage: completionPercentage
        };
      })
    );

    const total = countResult[0].total;
    const headers = createHeaders(Math.max(0, 99 - (plans.length || 0)));

    return NextResponse.json(
      createResponse(true, plansWithCompletion, null, {
        page,
        limit,
        total
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('[API V1 Plans GET] Error:', error);
    return NextResponse.json(
      createResponse(false, null, { code: 'SERVER_ERROR', message: 'Internal server error' }),
      { status: 500, headers: createHeaders() }
    );
  }
}

export async function POST(request) {
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
        createResponse(false, null, { code: 'FORBIDDEN', message: 'You do not have permission to create plans' }),
        { status: 403, headers: createHeaders() }
      );
    }

    const { customer_name, company_name, customer_email, template_id, go_live_date } = await request.json();

    if (!customer_name || !company_name || !customer_email) {
      return NextResponse.json(
        createResponse(false, null, { code: 'VALIDATION_ERROR', message: 'Missing required fields' }),
        { status: 400, headers: createHeaders() }
      );
    }

    // Check plan limit
    const subscription = await sql`
      SELECT plan_limit FROM vendor_subscriptions WHERE vendor_id = ${auth.vendorId}
    `;

    if (subscription[0]) {
      const activePlans = await sql`
        SELECT COUNT(*) as count FROM onboarding_plans 
        WHERE vendor_id = ${auth.vendorId} AND stage != 'completed'
      `;

      if (activePlans[0].count >= subscription[0].plan_limit) {
        return NextResponse.json(
          createResponse(false, null, { code: 'PLAN_LIMIT_REACHED', message: 'Plan limit reached for your tier' }),
          { status: 400, headers: createHeaders() }
        );
      }
    }

    // Create plan
    const result = await sql`
      INSERT INTO onboarding_plans (
        vendor_id,
        customer_name,
        company_name,
        customer_email,
        template_id,
        go_live_date,
        stage,
        created_at
      ) VALUES (
        ${auth.vendorId},
        ${customer_name},
        ${company_name},
        ${customer_email},
        ${template_id || null},
        ${go_live_date || null},
        'active',
        CURRENT_TIMESTAMP
      )
      RETURNING id, customer_name, company_name, stage, created_at, go_live_date
    `;

    const headers = createHeaders(98);

    return NextResponse.json(
      createResponse(true, result[0]),
      { status: 201, headers }
    );
  } catch (error) {
    console.error('[API V1 Plans POST] Error:', error);
    return NextResponse.json(
      createResponse(false, null, { code: 'SERVER_ERROR', message: 'Internal server error' }),
      { status: 500, headers: createHeaders() }
    );
  }
}

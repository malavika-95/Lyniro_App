import { NextResponse } from 'next/server';
import { authenticateApiKey, hasPermission } from '@/lib/api-auth';
import sql from '@/app/api/utils/sql';
import { triggerWebhook } from '@/lib/webhook-sender';

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

    if (!hasPermission(auth, 'messages:read')) {
      return NextResponse.json(
        createResponse(false, null, { code: 'FORBIDDEN', message: 'You do not have permission to read messages' }),
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

    // Get last 50 messages
    const messages = await sql`
      SELECT 
        id,
        content,
        sender_type,
        created_at,
        is_read
      FROM messages 
      WHERE plan_id = ${parseInt(id)}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json(
      createResponse(true, messages.reverse()),
      { status: 200, headers: createHeaders() }
    );
  } catch (error) {
    console.error('[API V1 Messages GET] Error:', error);
    return NextResponse.json(
      createResponse(false, null, { code: 'SERVER_ERROR', message: 'Internal server error' }),
      { status: 500, headers: createHeaders() }
    );
  }
}

export async function POST(request, { params }) {
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

    if (!hasPermission(auth, 'messages:write')) {
      return NextResponse.json(
        createResponse(false, null, { code: 'FORBIDDEN', message: 'You do not have permission to send messages' }),
        { status: 403, headers: createHeaders() }
      );
    }

    const { id } = await params;
    const { content, sender_type } = await request.json();

    if (!content) {
      return NextResponse.json(
        createResponse(false, null, { code: 'VALIDATION_ERROR', message: 'Content is required' }),
        { status: 400, headers: createHeaders() }
      );
    }

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

    // Create message
    const result = await sql`
      INSERT INTO messages (plan_id, content, sender_type, created_at)
      VALUES (${parseInt(id)}, ${content}, ${sender_type || 'vendor'}, NOW())
      RETURNING *
    `;

    // Trigger webhook
    triggerWebhook(auth.vendorId, 'message.received', { 
      messageId: result[0].id, 
      planId: parseInt(id), 
      content 
    });

    return NextResponse.json(
      createResponse(true, result[0]),
      { status: 201, headers: createHeaders(98) }
    );
  } catch (error) {
    console.error('[API V1 Messages POST] Error:', error);
    return NextResponse.json(
      createResponse(false, null, { code: 'SERVER_ERROR', message: 'Internal server error' }),
      { status: 500, headers: createHeaders() }
    );
  }
}

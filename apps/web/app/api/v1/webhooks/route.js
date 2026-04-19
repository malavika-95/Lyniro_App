import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import sql from '@/app/api/utils/sql';
import crypto from 'crypto';

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

    // Get all webhooks for this vendor (never return secret)
    const webhooks = await sql`
      SELECT 
        id,
        url,
        events,
        is_active,
        created_at
      FROM webhooks 
      WHERE vendor_id = ${auth.vendorId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(
      createResponse(true, webhooks),
      { status: 200, headers: createHeaders() }
    );
  } catch (error) {
    console.error('[API V1 Webhooks GET] Error:', error);
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

    const { url, events } = await request.json();

    // Validate URL
    if (!url || !url.startsWith('https://')) {
      return NextResponse.json(
        createResponse(false, null, { code: 'VALIDATION_ERROR', message: 'URL must be a valid HTTPS URL' }),
        { status: 400, headers: createHeaders() }
      );
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        createResponse(false, null, { code: 'VALIDATION_ERROR', message: 'Events array is required' }),
        { status: 400, headers: createHeaders() }
      );
    }

    // Generate secret
    const secret = crypto.randomBytes(32).toString('hex');

    // Create webhook
    const result = await sql`
      INSERT INTO webhooks (vendor_id, url, events, secret)
      VALUES (${auth.vendorId}, ${url}, ${JSON.stringify(events)}, ${secret})
      RETURNING id
    `;

    return NextResponse.json(
      createResponse(true, { 
        webhookId: result[0].id,
        secret,
        message: 'Save this secret. It will not be shown again.'
      }),
      { status: 201, headers: createHeaders(98) }
    );
  } catch (error) {
    console.error('[API V1 Webhooks POST] Error:', error);
    return NextResponse.json(
      createResponse(false, null, { code: 'SERVER_ERROR', message: 'Internal server error' }),
      { status: 500, headers: createHeaders() }
    );
  }
}

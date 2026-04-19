import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
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

export async function DELETE(request, { params }) {
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

    const { webhookId } = await params;

    // Verify webhook belongs to vendor
    const webhook = await sql`
      SELECT id FROM webhooks WHERE id = ${parseInt(webhookId)} AND vendor_id = ${auth.vendorId}
    `;

    if (!webhook[0]) {
      return NextResponse.json(
        createResponse(false, null, { code: 'NOT_FOUND', message: 'Webhook not found' }),
        { status: 404, headers: createHeaders() }
      );
    }

    // Delete webhook
    await sql`
      DELETE FROM webhooks WHERE id = ${parseInt(webhookId)}
    `;

    return NextResponse.json(
      createResponse(true, { message: 'Webhook deleted' }),
      { status: 200, headers: createHeaders() }
    );
  } catch (error) {
    console.error('[API V1 Webhook DELETE] Error:', error);
    return NextResponse.json(
      createResponse(false, null, { code: 'SERVER_ERROR', message: 'Internal server error' }),
      { status: 500, headers: createHeaders() }
    );
  }
}

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

    if (!hasPermission(auth, 'tasks:write')) {
      return NextResponse.json(
        createResponse(false, null, { code: 'FORBIDDEN', message: 'You do not have permission to update tasks' }),
        { status: 403, headers: createHeaders() }
      );
    }

    const { id, taskId } = await params;
    const { status, blocked_reason } = await request.json();

    // Verify task belongs to vendor's plan
    const task = await sql`
      SELECT t.id, t.plan_id FROM tasks t
      JOIN onboarding_plans op ON op.id = t.plan_id
      WHERE t.id = ${parseInt(taskId)} AND op.vendor_id = ${auth.vendorId} AND op.id = ${parseInt(id)}
    `;

    if (!task[0]) {
      return NextResponse.json(
        createResponse(false, null, { code: 'NOT_FOUND', message: 'Task not found' }),
        { status: 404, headers: createHeaders() }
      );
    }

    if (!status) {
      return NextResponse.json(
        createResponse(false, null, { code: 'VALIDATION_ERROR', message: 'Status is required' }),
        { status: 400, headers: createHeaders() }
      );
    }

    let result;
    if (status === 'completed') {
      result = await sql`
        UPDATE tasks 
        SET status = ${status}, completed_at = NOW()
        WHERE id = ${parseInt(taskId)}
        RETURNING *
      `;
    } else if (status === 'blocked' && blocked_reason) {
      result = await sql`
        UPDATE tasks 
        SET status = ${status}, blocked_reason = ${blocked_reason}
        WHERE id = ${parseInt(taskId)}
        RETURNING *
      `;
    } else {
      result = await sql`
        UPDATE tasks 
        SET status = ${status}
        WHERE id = ${parseInt(taskId)}
        RETURNING *
      `;
    }

    // Trigger webhooks
    if (status === 'completed') {
      triggerWebhook(auth.vendorId, 'task.completed', { taskId: parseInt(taskId), planId: parseInt(id) });
    } else if (status === 'blocked') {
      triggerWebhook(auth.vendorId, 'task.blocked', { taskId: parseInt(taskId), planId: parseInt(id), reason: blocked_reason });
    }

    return NextResponse.json(
      createResponse(true, result[0]),
      { status: 200, headers: createHeaders() }
    );
  } catch (error) {
    console.error('[API V1 Task PATCH] Error:', error);
    return NextResponse.json(
      createResponse(false, null, { code: 'SERVER_ERROR', message: 'Internal server error' }),
      { status: 500, headers: createHeaders() }
    );
  }
}

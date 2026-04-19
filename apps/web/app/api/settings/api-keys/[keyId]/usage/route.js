import { getCurrentUser } from '@/lib/session-utils';
import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== 'vendor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keyId } = await params;

    // Verify key belongs to this vendor
    const key = await sql`
      SELECT vendor_id FROM api_keys WHERE id = ${parseInt(keyId)}
    `;

    if (!key[0] || key[0].vendor_id !== user.organizationId) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Get total requests in last 30 days
    const totalRequests = await sql`
      SELECT COUNT(*) as count FROM api_key_usage 
      WHERE api_key_id = ${parseInt(keyId)} AND created_at > NOW() - INTERVAL '30 days'
    `;

    // Get requests by day for last 30 days
    const requestsByDay = await sql`
      SELECT 
        DATE(created_at) as day,
        COUNT(*) as count
      FROM api_key_usage 
      WHERE api_key_id = ${parseInt(keyId)} AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY day DESC
    `;

    // Get most called endpoints
    const topEndpoints = await sql`
      SELECT 
        endpoint,
        COUNT(*) as count,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
      FROM api_key_usage 
      WHERE api_key_id = ${parseInt(keyId)} AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY endpoint
      ORDER BY count DESC
      LIMIT 10
    `;

    // Calculate error rate
    const errorStats = await sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
      FROM api_key_usage 
      WHERE api_key_id = ${parseInt(keyId)} AND created_at > NOW() - INTERVAL '30 days'
    `;

    const errorRate = errorStats[0].total > 0 
      ? ((errorStats[0].error_count / errorStats[0].total) * 100).toFixed(2)
      : 0;

    return NextResponse.json({
      totalRequests: totalRequests[0].count,
      requestsByDay,
      topEndpoints,
      errorRate: parseFloat(errorRate)
    });
  } catch (error) {
    console.error('[API Key Usage GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage stats' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request) {
  try {
    // Check admin session from cookies
    const sessionId = request.cookies.get('lyniro-admin-session')?.value;
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all stats in parallel
    const [
      totalVendorsRes,
      totalUsersRes,
      totalPlansRes,
      totalClientsRes,
      newVendorsThisWeekRes,
      activePlansRes,
      plansByTierRes,
      recentSignupsRes
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vendors`,
      sql`SELECT COUNT(*) as count FROM csm_users`,
      sql`SELECT COUNT(*) as count FROM onboarding_plans`,
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM vendors WHERE created_at > NOW() - INTERVAL '7 days'`,
      sql`SELECT COUNT(*) as count FROM onboarding_plans WHERE stage NOT IN ('completed', 'archived')`,
      sql`SELECT COALESCE(tier, 'free') as tier, COUNT(*) as count FROM vendor_subscriptions GROUP BY COALESCE(tier, 'free') ORDER BY tier`,
      sql`SELECT DISTINCT v.id, v.name as company_name, cu.email as owner_email, v.created_at as date_joined, COALESCE(vs.tier, 'free') as tier FROM vendors v LEFT JOIN csm_users cu ON cu.vendor_id = v.id AND cu.role = 'owner' LEFT JOIN vendor_subscriptions vs ON vs.vendor_id = v.id ORDER BY v.created_at DESC LIMIT 5`
    ]);

    // Add plan count to each signup
    const recentSignupsWithPlanCount = await Promise.all(
      recentSignupsRes.map(async (signup) => {
        const planCountRes = await sql`SELECT COUNT(*) as count FROM onboarding_plans WHERE vendor_id = ${signup.id}`;
        return {
          ...signup,
          plan_count: planCountRes[0]?.count || 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      stats: {
        total_vendors: parseInt(totalVendorsRes[0].count),
        total_users: parseInt(totalUsersRes[0].count),
        total_plans: parseInt(totalPlansRes[0].count),
        total_clients: parseInt(totalClientsRes[0].count),
        new_vendors_this_week: parseInt(newVendorsThisWeekRes[0].count),
        active_plans: parseInt(activePlansRes[0].count),
        plans_by_tier: plansByTierRes.map(tier => ({
          tier: tier.tier,
          count: parseInt(tier.count)
        })),
        recent_signups: recentSignupsWithPlanCount
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    );
  }
}

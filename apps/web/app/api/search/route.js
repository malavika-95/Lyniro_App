import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session-utils";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = `%${query}%`;
    const vendorId = user.organizationId;

    // Search plans
    const plans = await sql`
      SELECT 
        'plan' as type,
        id,
        customer_name as title,
        company_name as subtitle,
        NULL as description
      FROM onboarding_plans
      WHERE vendor_id = ${vendorId}
      AND (customer_name ILIKE ${searchTerm} OR company_name ILIKE ${searchTerm})
      ORDER BY created_at DESC
      LIMIT 5
    `;

    // Search tasks
    const tasks = await sql`
      SELECT 
        'task' as type,
        t.id,
        t.title,
        op.customer_name as subtitle,
        t.description
      FROM tasks t
      JOIN onboarding_plans op ON t.plan_id = op.id
      WHERE op.vendor_id = ${vendorId}
      AND t.title ILIKE ${searchTerm}
      ORDER BY t.created_at DESC
      LIMIT 5
    `;

    // Search templates
    const templates = await sql`
      SELECT 
        'template' as type,
        id,
        name as title,
        NULL as subtitle,
        description
      FROM templates
      WHERE csm_id = ${user.userId}
      AND name ILIKE ${searchTerm}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    // Search team members
    const teamMembers = await sql`
      SELECT 
        'team' as type,
        id,
        member_name as title,
        member_email as subtitle,
        NULL as description
      FROM team_members
      WHERE csm_id = ${user.userId}
      AND (member_name ILIKE ${searchTerm} OR member_email ILIKE ${searchTerm})
      ORDER BY created_at DESC
      LIMIT 5
    `;

    // Combine and limit results
    const results = [...plans, ...tasks, ...templates, ...teamMembers].slice(0, 12);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[Search] Error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

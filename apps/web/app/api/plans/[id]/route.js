import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { requireAuth, requirePlanAccess } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    // CRITICAL: Authenticate user
    const user = await getCurrentUser();
    requireAuth(user);
    
    // CRITICAL: Check plan access (enforces org boundaries)
    await requirePlanAccess(user, id);

    // Fetch plan
    const plans = await sql`
      SELECT * FROM onboarding_plans WHERE id = ${id}
    `;

    if (!plans.length) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }

    const plan = plans[0];

    // Fetch CSM info
    const csm = await sql`
      SELECT id, first_name, last_name, email, company_logo_url, brand_color
      FROM csm_users
      WHERE id = (SELECT csm_id FROM templates WHERE id = ${plan.template_id})
    `;

    // Fetch stages
    const stages = await sql`
      SELECT id, template_id, stage_number, name, description, position
      FROM template_stages 
      WHERE template_id = ${plan.template_id}
      ORDER BY position ASC
    `;

    // Fetch tasks - get both template definition and plan-specific instance
    const tasks = await sql`
      SELECT 
        COALESCE(pt.id, t.id) as id,
        t.id as task_id,
        t.name as title,
        t.description,
        t.assigned_to,
        t.due_day,
        t.priority,
        t.stage_id,
        COALESCE(pt.status, 'pending') as status,
        COALESCE(pt.blocked_reason, '') as blocked_reason,
        pt.completed_at,
        CASE WHEN pt.id IS NULL THEN false ELSE true END as task_created
      FROM template_tasks t
      INNER JOIN template_stages ts ON t.stage_id = ts.id
      LEFT JOIN tasks pt ON pt.task_id = t.id AND pt.plan_id = ${id}
      WHERE ts.template_id = ${plan.template_id}
      ORDER BY ts.position ASC, t.position ASC
    `;

    console.log('🔍 [API] Plan ID:', id, 'Template ID:', plan.template_id, 'Tasks found:', tasks.length);

    console.log('✅ [API Route] Returning plan with', tasks.length, 'tasks and', stages.length, 'stages');

    const responseData = {
      id: plan.id,
      customer_name: plan.customer_name,
      company_name: plan.company_name,
      template_id: plan.template_id,
      csm: csm[0] || null,
      stages,
      tasks,
      _debug: { tasksCount: tasks.length, stagesCount: stages.length, sampleTask: tasks[0] }
    };
    
    console.log('📤 [API Response] Sending:', JSON.stringify(responseData._debug));
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching plan:', error);
    return NextResponse.json({ success: false, error: "Failed to fetch plan" }, { status: 500 });
  }
}

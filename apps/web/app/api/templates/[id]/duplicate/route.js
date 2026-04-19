import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    const user = await sql`SELECT id, role FROM csm_users LIMIT 1`;
    if (!user[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if (user[0].role === "Member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const sourceTemplate = await sql`SELECT * FROM templates WHERE id = ${parseInt(id)}`;

    if (!sourceTemplate[0]) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const newTemplate = await sql`
      INSERT INTO templates (csm_id, name, description, estimated_duration_days, status)
      VALUES (${user[0].id}, ${sourceTemplate[0].name + ' (Copy)'}, ${sourceTemplate[0].description}, ${sourceTemplate[0].estimated_duration_days}, 'draft')
      RETURNING *
    `;

    const sourceStages = await sql`
      SELECT * FROM template_stages WHERE template_id = ${parseInt(id)} ORDER BY position
    `;

    for (const stage of sourceStages) {
      const newStage = await sql`
        INSERT INTO template_stages (template_id, stage_number, name, description, position)
        VALUES (${newTemplate[0].id}, ${stage.stage_number}, ${stage.name}, ${stage.description}, ${stage.position})
        RETURNING id
      `;

      const tasks = await sql`
        SELECT * FROM template_tasks WHERE stage_id = ${stage.id} ORDER BY position
      `;

      for (const task of tasks) {
        await sql`
          INSERT INTO template_tasks (stage_id, name, description, assigned_to, due_day, priority, position)
          VALUES (${newStage[0].id}, ${task.name}, ${task.description}, ${task.assigned_to}, ${task.due_day}, ${task.priority}, ${task.position})
        `;
      }
    }

    return NextResponse.json(newTemplate[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

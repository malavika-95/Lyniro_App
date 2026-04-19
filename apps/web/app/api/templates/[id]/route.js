import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    const template = await sql`
      SELECT 
        t.id,
        t.name,
        t.description,
        t.estimated_duration_days,
        t.status,
        t.updated_at,
        cu.first_name,
        cu.last_name
      FROM templates t
      JOIN csm_users cu ON t.csm_id = cu.id
      WHERE t.id = ${parseInt(id)}
    `;

    if (!template[0]) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const stages = await sql`
      SELECT id, stage_number, name, description, position
      FROM template_stages
      WHERE template_id = ${parseInt(id)}
      ORDER BY position
    `;

    const tasksMap = {};
    for (const stage of stages) {
      const tasks = await sql`
        SELECT id, name, description, assigned_to, due_day, priority, position
        FROM template_tasks
        WHERE stage_id = ${stage.id}
        ORDER BY position
      `;
      tasksMap[stage.id] = tasks;
    }

    const stagesWithTasks = stages.map(stage => ({
      ...stage,
      tasks: tasksMap[stage.id] || []
    }));

    return NextResponse.json({
      ...template[0],
      stages: stagesWithTasks
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await sql`SELECT id, role FROM csm_users LIMIT 1`;
    if (!user[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { id } = await params;
    const { name, description, estimatedDurationDays, stages } = await request.json();

    const template = await sql`
      UPDATE templates
      SET name = ${name}, 
          description = ${description},
          estimated_duration_days = ${estimatedDurationDays},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (!template[0]) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await sql`DELETE FROM template_stages WHERE template_id = ${parseInt(id)}`;

    for (const stage of stages) {
      const newStage = await sql`
        INSERT INTO template_stages (template_id, stage_number, name, description, position)
        VALUES (${parseInt(id)}, ${stage.stage_number}, ${stage.name}, ${stage.description}, ${stage.position})
        RETURNING id
      `;

      for (const task of stage.tasks) {
        await sql`
          INSERT INTO template_tasks (stage_id, name, description, assigned_to, due_day, priority, position)
          VALUES (${newStage[0].id}, ${task.name}, ${task.description}, ${task.assigned_to}, ${task.due_day}, ${task.priority}, ${task.position})
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await sql`SELECT id, role FROM csm_users LIMIT 1`;
    if (!user[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if (user[0].role !== "Owner") {
      return NextResponse.json({ error: "Only owners can delete templates" }, { status: 403 });
    }

    const { id } = await params;
    const template = await sql`SELECT * FROM templates WHERE id = ${parseInt(id)}`;

    if (!template[0]) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await sql`DELETE FROM templates WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

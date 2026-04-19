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
    const template = await sql`
      UPDATE templates
      SET status = 'published', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (!template[0]) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

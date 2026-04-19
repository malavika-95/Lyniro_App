import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const planId = parseInt(id);

    if (!planId) {
      return NextResponse.json({ success: false, error: "Invalid plan ID" }, { status: 400 });
    }

    const contacts = await sql`
      SELECT id, name, email, phone_number, created_at
      FROM contacts
      WHERE plan_id = ${planId}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      success: true,
      data: contacts || []
    });
  } catch (error) {
    console.error("[Contacts] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const planId = parseInt(id);
    const { name, email, phone_number } = await request.json();

    if (!planId || !name || !email) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO contacts (plan_id, name, email, phone_number, created_at)
      VALUES (${planId}, ${name}, ${email}, ${phone_number || null}, CURRENT_TIMESTAMP)
      RETURNING id, name, email, phone_number, created_at
    `;

    return NextResponse.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error("[Contacts] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

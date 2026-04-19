import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const result = await sql`
      SELECT et.*, t.title, t.description, t.plan_id, op.customer_name, op.customer_email, op.company_name
      FROM email_tokens et
      LEFT JOIN tasks t ON et.task_id = t.id
      LEFT JOIN onboarding_plans op ON et.plan_id = op.id
      WHERE et.token = ${token}
      AND et.expires_at > NOW()
      AND et.used_at IS NULL
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: "This link has expired or is no longer valid" },
        { status: 401 }
      );
    }

    const tokenData = result[0];

    return NextResponse.json({
      token: tokenData.token,
      plan_id: tokenData.plan_id,
      task_id: tokenData.task_id,
      action_type: tokenData.action_type,
      title: tokenData.title,
      description: tokenData.description,
      customer_name: tokenData.customer_name,
      customer_email: tokenData.customer_email,
      company_name: tokenData.company_name,
    });
  } catch (error) {
    console.error("Error validating token:", error);
    return NextResponse.json(
      { error: "Error validating token" },
      { status: 500 }
    );
  }
}

import { getCurrentUser } from "@/lib/session-utils";
import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if requesting published templates only
    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get("published") === "true";

    let templates;
    if (publishedOnly) {
      templates = await sql`
        SELECT id, csm_id, name, description, estimated_duration_days, status, created_at, updated_at, vendor_id
        FROM templates
        WHERE vendor_id = ${user.organizationId}
        AND status = 'published'
        ORDER BY created_at DESC
      `;
    } else {
      templates = await sql`
        SELECT id, csm_id, name, description, estimated_duration_days, status, created_at, updated_at, vendor_id
        FROM templates
        WHERE vendor_id = ${user.organizationId}
        ORDER BY created_at DESC
      `;
    }

    // Fetch stages for each template
    const templatesWithStages = await Promise.all(
      templates.map(async (template) => {
        const stages = await sql`
          SELECT id, template_id, stage_number, name, description, position, created_at
          FROM template_stages
          WHERE template_id = ${template.id}
          ORDER BY position ASC
        `;

        return {
          ...template,
          stages
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: templatesWithStages
    });
  } catch (error) {
    console.error("[Templates] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { name, description, estimated_duration_days } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Template name is required" },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO templates (csm_id, name, description, estimated_duration_days, status, vendor_id, created_at, updated_at)
      VALUES (${user.userId}, ${name}, ${description || null}, ${estimated_duration_days || 30}, 'draft', ${user.organizationId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, csm_id, name, description, estimated_duration_days, status, created_at, updated_at, vendor_id
    `;

    const template = result[0];

    return NextResponse.json({
      success: true,
      data: {
        ...template,
        stages: []
      }
    });
  } catch (error) {
    console.error("[Templates] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create template" },
      { status: 500 }
    );
  }
}

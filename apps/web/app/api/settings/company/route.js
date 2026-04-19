import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const company = await sql`SELECT id, company_name, brand_color, company_logo_url FROM csm_users WHERE vendor_id = ${user.organizationId} LIMIT 1`;
    return NextResponse.json(company[0] || {});
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== 'OWNER') {
      return NextResponse.json({ error: "Only owner can change company settings" }, { status: 403 });
    }

    const { companyName, brandColor, logoUrl } = await request.json();
    const updated = await sql`
      UPDATE csm_users 
      SET company_name = ${companyName}, 
          brand_color = ${brandColor},
          company_logo_url = ${logoUrl},
          updated_at = CURRENT_TIMESTAMP
      WHERE vendor_id = ${user.organizationId}
      RETURNING id, company_name, brand_color, company_logo_url
    `;
    return NextResponse.json(updated[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

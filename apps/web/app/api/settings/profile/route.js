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

    // Get CSM user profile
    const profile = await sql`
      SELECT 
        id, 
        email, 
        first_name, 
        last_name, 
        password_hash, 
        company_name, 
        company_logo_url, 
        brand_color, 
        created_at, 
        updated_at, 
        role, 
        manager_id, 
        vendor_id, 
        bio, 
        avatar_url, 
        theme_preference
      FROM csm_users
      WHERE id = ${user.userId}
    `;

    if (!profile[0]) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    const p = profile[0];

    return NextResponse.json({
      success: true,
      id: p.id,
      email: p.email,
      firstName: p.first_name,
      lastName: p.last_name,
      companyName: p.company_name,
      companyLogoUrl: p.company_logo_url,
      brandColor: p.brand_color,
      role: p.role,
      managerId: p.manager_id,
      vendorId: p.vendor_id,
      bio: p.bio,
      avatarUrl: p.avatar_url,
      themePreference: p.theme_preference,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    });
  } catch (error) {
    console.error("[Settings Profile] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { firstName, lastName, companyName, bio, avatarUrl, brandColor, themePreference } = await request.json();

    await sql`
      UPDATE csm_users
      SET 
        first_name = COALESCE(${firstName || null}, first_name),
        last_name = COALESCE(${lastName || null}, last_name),
        company_name = COALESCE(${companyName || null}, company_name),
        bio = COALESCE(${bio || null}, bio),
        avatar_url = COALESCE(${avatarUrl || null}, avatar_url),
        brand_color = COALESCE(${brandColor || null}, brand_color),
        theme_preference = COALESCE(${themePreference || null}, theme_preference),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${user.userId}
    `;

    return NextResponse.json({
      success: true,
      message: "Profile updated"
    });
  } catch (error) {
    console.error("[Settings Profile] Update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { requireAuth, requireRole, getVendorId } from "@/lib/rbac";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

/**
 * Create CSM users (single or bulk)
 * - Only OWNER can create users
 * - Creates in the same vendor/organization
 */
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    requireAuth(user);
    requireRole(user, ["OWNER"]);

    const { users } = await request.json();

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { success: false, error: "users array is required and must not be empty" },
        { status: 400 }
      );
    }

    const vendorId = getVendorId(user);
    const createdUsers = [];
    const errors = [];

    // Process each user
    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      const rowIndex = i + 1;

      try {
        // Validate required fields
        if (!userData.email || !userData.first_name) {
          errors.push({
            row: rowIndex,
            email: userData.email,
            error: "email and first_name are required"
          });
          continue;
        }

        // Check if user already exists
        const existingUser = await sql`
          SELECT id FROM csm_users WHERE email = ${userData.email} AND vendor_id = ${vendorId}
        `;

        if (existingUser.length > 0) {
          errors.push({
            row: rowIndex,
            email: userData.email,
            error: "User already exists with this email"
          });
          continue;
        }

        // Generate password hash if password provided, otherwise set random
        let passwordHash = null;
        if (userData.password) {
          passwordHash = await bcrypt.hash(userData.password, 10);
        } else {
          // Generate a temporary password
          const tempPassword = Math.random().toString(36).slice(-12);
          passwordHash = await bcrypt.hash(tempPassword, 10);
        }

        // Create user
        const newUser = await sql`
          INSERT INTO csm_users (
            email,
            first_name,
            last_name,
            password_hash,
            company_name,
            vendor_id,
            role,
            created_at,
            updated_at,
            status
          )
          VALUES (
            ${userData.email},
            ${userData.first_name},
            ${userData.last_name || null},
            ${passwordHash},
            ${userData.company_name || null},
            ${vendorId},
            ${userData.role || "MEMBER"},
            NOW(),
            NOW(),
            'active'
          )
          RETURNING id, email, first_name, last_name, role, created_at
        `;

        if (newUser.length > 0) {
          createdUsers.push(newUser[0]);
        }
      } catch (userError) {
        errors.push({
          row: rowIndex,
          email: userData.email,
          error: userError.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      createdCount: createdUsers.length,
      errorCount: errors.length,
      data: {
        created: createdUsers,
        errors: errors.length > 0 ? errors : null
      }
    });
  } catch (error) {
    console.error("[Create Users] Error:", error.message);
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create users"
      },
      { status: statusCode }
    );
  }
}

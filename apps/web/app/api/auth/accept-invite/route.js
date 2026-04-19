import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function POST(request) {
  try {
    const { token, password, firstName, lastName } = await request.json();

    if (!token || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Look up the invite token
    const invite = await sql`
      SELECT id, member_email, role, csm_id 
      FROM team_members 
      WHERE invite_token = ${token}
      AND status = 'pending'
    `;

    if (!invite[0]) {
      return NextResponse.json(
        { error: "Invalid or expired invite" },
        { status: 400 }
      );
    }

    // Check if more than 7 days old
    const invitedAtCheck = await sql`
      SELECT invited_at FROM team_members WHERE id = ${invite[0].id}
    `;

    if (invitedAtCheck[0]) {
      const invitedDate = new Date(invitedAtCheck[0].invited_at);
      const expiresDate = new Date(invitedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (new Date() > expiresDate) {
        return NextResponse.json(
          { error: "Invite has expired" },
          { status: 400 }
        );
      }
    }

    // Get the inviting user's vendor
    const invitingUser = await sql`
      SELECT vendor_id FROM csm_users WHERE id = ${invite[0].csm_id}
    `;

    if (!invitingUser[0]) {
      return NextResponse.json(
        { error: "Invalid invite" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the new csm_user
    const newUser = await sql`
      INSERT INTO csm_users (
        email,
        first_name,
        last_name,
        password_hash,
        role,
        vendor_id,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${invite[0].member_email},
        ${firstName},
        ${lastName},
        ${passwordHash},
        ${invite[0].role},
        ${invitingUser[0].vendor_id},
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING id, email, first_name, last_name, role, vendor_id
    `;

    // Mark the invite as accepted
    await sql`
      UPDATE team_members 
      SET status = 'active', accepted_at = CURRENT_TIMESTAMP 
      WHERE id = ${invite[0].id}
    `;

    return NextResponse.json({
      success: true,
      data: {
        userId: newUser[0].id,
        email: newUser[0].email,
        firstName: newUser[0].first_name,
        lastName: newUser[0].last_name,
        role: newUser[0].role,
        message: "Account created successfully! You can now sign in."
      }
    });
  } catch (error) {
    console.error("[Accept Invite] Error:", error);
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}

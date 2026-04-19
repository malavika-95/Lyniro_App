import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import bcrypt from "bcrypt";

export async function POST(request) {
  try {
    // Rate limit OTP verification
    try {
      enforceRateLimit(request, RATE_LIMITS.LOGIN, "verify-otp");
    } catch (rateLimitError) {
      return NextResponse.json(
        { error: rateLimitError.message },
        { status: 429 }
      );
    }

    const { email, code, type = "signup" } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      );
    }

    // Find valid OTP
    const otpRecord = await sql`
      SELECT * FROM otp_codes 
      WHERE email = ${email} AND code = ${code} AND type = ${type}
      ORDER BY created_at DESC LIMIT 1
    `;

    if (otpRecord.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 400 }
      );
    }

    const otp = otpRecord[0];

    // Check if OTP is expired
    if (new Date(otp.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Code has expired" },
        { status: 400 }
      );
    }

    // Check if already used
    if (otp.used_at) {
      return NextResponse.json(
        { error: "Code has already been used" },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await sql`
      UPDATE otp_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ${otp.id}
    `;

    if (type === "signup") {
      // Check if email already exists
      const existingUser = await sql`
        SELECT id FROM csm_users WHERE email = ${email}
      `;

      if (existingUser.length > 0) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }

      // Create vendor in vendors table
      const vendorResult = await sql`
        INSERT INTO vendors (name, created_at)
        VALUES (${otp.company_name || "New Company"}, CURRENT_TIMESTAMP)
        RETURNING id
      `;

      const vendorId = vendorResult[0].id;

      // Create a random temporary password (won't be used by user)
      const tempPassword = Math.random().toString(36).substring(2, 15);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Create owner user in csm_users
      const userResult = await sql`
        INSERT INTO csm_users (
          email,
          first_name,
          last_name,
          password_hash,
          company_name,
          role,
          vendor_id,
          created_at,
          updated_at
        ) VALUES (
          ${email},
          ${otp.first_name || ""},
          ${otp.last_name || ""},
          ${passwordHash},
          ${otp.company_name || ""},
          'owner',
          ${vendorId},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING id, email, first_name, last_name, role
      `;

      if (!userResult[0]) {
        return NextResponse.json(
          { error: "Failed to create account" },
          { status: 500 }
        );
      }

      const user = userResult[0];

      return NextResponse.json({
        success: true,
        message: "Account created successfully",
        data: {
          userId: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          vendorId: vendorId
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Code verified successfully"
    });
  } catch (error) {
    console.error("[Verify OTP] Error:", error);
    return NextResponse.json(
      { error: "Failed to verify code. Please try again." },
      { status: 500 }
    );
  }
}

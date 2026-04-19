import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

export async function POST(request) {
  try {
    // Rate limit OTP requests
    try {
      enforceRateLimit(request, RATE_LIMITS.EMAIL, "send-otp");
    } catch (rateLimitError) {
      return NextResponse.json(
        { error: rateLimitError.message },
        { status: 429 }
      );
    }

    const { email, type = "signup", firstName, lastName, companyName } =
      await request.json();

    if (!email || !type) {
      return NextResponse.json(
        { error: "Email and type are required" },
        { status: 400 }
      );
    }

    // Check if email already exists for signup type
    if (type === "signup") {
      const existingUser = await sql`
        SELECT id FROM csm_users WHERE email = ${email}
      `;

      if (existingUser.length > 0) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP
    const result = await sql`
      INSERT INTO otp_codes (email, code, type, expires_at, first_name, last_name, company_name)
      VALUES (${email}, ${otp}, ${type}, ${expiresAt.toISOString()}, ${firstName || null}, ${lastName || null}, ${companyName || null})
      RETURNING id
    `;

    // Send email with OTP
    let emailSent = false;
    try {
      console.log(`
[OTP] 📨 Step 1: Sending OTP email`);
      console.log(`[OTP] Email: ${email}`);
      console.log(`[OTP] Type: ${type}`);
      console.log(`[OTP] OTP Code: ${otp}`);
      
      const emailResult = await sendEmail({
        to: email,
        subject: type === "signup" ? "Your signup code" : "Your verification code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verification Code</h2>
            <p>Your verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; text-align: center; background: #f5f5f5; padding: 20px; border-radius: 8px;">
              ${otp}
            </div>
            <p>This code expires in 10 minutes.</p>
            <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
        text: `Your verification code is: ${otp}

This code expires in 10 minutes.`,
        type: 'system'
      });
      
      console.log(`[OTP] ✅ Email sent successfully:`, emailResult);
      emailSent = true;
    } catch (emailError) {
      console.error(`[OTP] ❌ Email failed to send:`, emailError.message);
      // Continue anyway - OTP was stored in the database
      // User can still verify if they got the code through other means
    }

    console.log(`[OTP] ✅ Step 2: OTP stored in database (ID: ${result[0].id})`);
    
    return NextResponse.json({
      success: true,
      message: emailSent ? "Code sent to email" : "Code generated (email delivery may have failed)",
      otpId: result[0].id,
      emailStatus: emailSent ? "sent" : "failed"
    });
  } catch (error) {
    console.error("[Send OTP] Error:", error);
    return NextResponse.json(
      { error: "Failed to send OTP. Please try again." },
      { status: 500 }
    );
  }
}

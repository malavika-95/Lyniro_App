import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

export async function POST(request) {
  try {
    // CRITICAL: Rate limit vendor signup to prevent account flooding
    try {
      enforceRateLimit(request, RATE_LIMITS.LOGIN, "vendor-signup");
    } catch (rateLimitError) {
      return NextResponse.json(
        { error: rateLimitError.message },
        { status: 429 }
      );
    }
    
    const { email, password, firstName, lastName, companyName } = await request.json();

    // Validate input
    if (!email || !password || !firstName || !lastName || !companyName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if user with this email already exists
    const existingUser = await sql`
      SELECT id FROM csm_users WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }

    // Check if vendor with this company name already exists
    const existingVendor = await sql`
      SELECT id, name FROM vendors WHERE LOWER(name) = LOWER(${companyName})
    `;

    let vendorId;
    let userStatus = 'active';
    let userRole = 'owner';

    if (existingVendor.length > 0) {
      // Vendor exists - new user is joining as pending member
      vendorId = existingVendor[0].id;
      userStatus = 'pending';
      userRole = 'member';
    } else {
      // Create new vendor
      const vendorResult = await sql`
        INSERT INTO vendors (name, created_at)
        VALUES (${companyName}, CURRENT_TIMESTAMP)
        RETURNING id
      `;
      vendorId = vendorResult[0].id;

      // Create default subscription for new vendor
      await sql`
        INSERT INTO vendor_subscriptions (vendor_id, tier, plan_limit)
        VALUES (${vendorId}, 'free', 3)
      `;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in csm_users
    const userResult = await sql`
      INSERT INTO csm_users (
        email,
        first_name,
        last_name,
        password_hash,
        company_name,
        role,
        vendor_id,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${email},
        ${firstName},
        ${lastName},
        ${passwordHash},
        ${companyName},
        ${userRole},
        ${vendorId},
        ${userStatus},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING id, email, first_name, last_name, role, status
    `;

    if (!userResult[0]) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    const user = userResult[0];

    // Handle email sending based on status
    if (userStatus === 'pending') {
      // Send approval request email to owner
      const owner = await sql`
        SELECT id, email, first_name FROM csm_users 
        WHERE vendor_id = ${vendorId} 
        AND role = 'owner'
        LIMIT 1
      `;

      if (owner[0]) {
        const approvalEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
    .container { background-color: #ffffff; max-width: 600px; margin: 20px auto; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0; }
    .logo { font-size: 28px; font-weight: bold; color: #2563EB; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 20px; color: #333; }
    .content { margin-bottom: 30px; color: #555; }
    .member-info { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #2563EB; margin: 20px 0; }
    .info-label { font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 5px; }
    .info-value { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 10px; }
    .button-group { margin: 20px 0; }
    .cta-button { display: inline-block; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-right: 10px; }
    .approve-button { background-color: #10b981; color: white; }
    .approve-button:hover { background-color: #059669; }
    .reject-button { background-color: #ef4444; color: white; }
    .reject-button:hover { background-color: #dc2626; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Lyniro</div>
    </div>
    
    <div class="greeting">
      New member requesting access
    </div>
    
    <div class="content">
      <p>${firstName} ${lastName} has requested access to your ${companyName} workspace on Lyniro.</p>
      
      <div class="member-info">
        <div class="info-label">Name</div>
        <div class="info-value">${firstName} ${lastName}</div>
        <div class="info-label">Email</div>
        <div class="info-value">${email}</div>
      </div>
      
      <p>As the workspace owner, you can approve or reject this request.</p>
      
      <div class="button-group">
        <a href="https://3000-iuzbtmu87kpjzq3tqwoq9.prev.appgen.com/settings/team?approve=${user.id}" class="cta-button approve-button">Approve Request</a>
        <a href="https://3000-iuzbtmu87kpjzq3tqwoq9.prev.appgen.com/settings/team?reject=${user.id}" class="cta-button reject-button">Reject Request</a>
      </div>
    </div>
    
    <div class="footer">
      <p>Need help? Contact us at <strong>hello@lyniro.com</strong></p>
      <p>&copy; 2024 Lyniro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `;

        try {
          await sendEmail({
            to: owner[0].email,
            subject: "New member requesting access to your Lyniro workspace",
            html: approvalEmailHtml,
            type: 'vendor'
          });
        } catch (emailError) {
          console.error("[Vendor Signup] Approval email failed:", emailError);
        }
      }
    } else {
      // Send welcome email to new owner
      const welcomeEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      background-color: #ffffff;
      max-width: 600px;
      margin: 20px auto;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e0e0e0;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #2563EB;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #333;
    }
    .content {
      margin-bottom: 30px;
      color: #555;
    }
    .workspace-info {
      background-color: #f9f9f9;
      padding: 15px;
      border-left: 4px solid #2563EB;
      margin: 20px 0;
    }
    .workspace-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #999;
      margin-bottom: 5px;
    }
    .workspace-name {
      font-size: 16px;
      font-weight: bold;
      color: #2563EB;
    }
    .cta-button {
      display: inline-block;
      background-color: #2563EB;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
    .cta-button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Lyniro</div>
    </div>
    
    <div class="greeting">
      Welcome, ${firstName}!
    </div>
    
    <div class="content">
      <p>Your account has been successfully created on Lyniro. You're all set to start managing your onboarding workflows.</p>
      
      <div class="workspace-info">
        <div class="workspace-label">Your Workspace</div>
        <div class="workspace-name">${companyName}</div>
      </div>
      
      <p>Get started by signing in to your account and creating your first onboarding plan.</p>
      
      <a href="https://3000-iuzbtmu87kpjzq3tqwoq9.prev.appgen.com/csm-login" class="cta-button">Sign in to your account</a>
    </div>
    
    <div class="footer">
      <p>Need help? Contact us at <strong>hello@lyniro.com</strong></p>
      <p>&copy; 2024 Lyniro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;

      try {
        await sendEmail({
          to: email,
          subject: "Welcome to Lyniro — your account is ready",
          html: welcomeEmailHtml,
          type: 'system'
        });
      } catch (emailError) {
        console.error("[Vendor Signup] Welcome email failed:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      status: userStatus,
      data: {
        userId: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        vendorId: vendorId
      },
      message: userStatus === 'pending' 
        ? 'Your account is awaiting approval from your company owner.'
        : 'Welcome! Your account is ready.'
    });
  } catch (error) {
    console.error("[Vendor Signup] Error:", error);
    return NextResponse.json(
      { error: "Signup failed. Please try again." },
      { status: 500 }
    );
  }
}

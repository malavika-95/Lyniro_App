import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import { sendEmail } from "@/lib/email";

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.sessionType !== "vendor") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only owners or managers can approve
    if (user.role !== 'owner' && user.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { memberId, action } = await request.json();

    if (!memberId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    // Verify the member belongs to this vendor
    const member = await sql`
      SELECT id, email, first_name, last_name, vendor_id 
      FROM csm_users 
      WHERE id = ${parseInt(memberId)}
    `;

    if (!member[0] || member[0].vendor_id !== user.organizationId) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      // Update status to active
      await sql`
        UPDATE csm_users 
        SET status = 'active', approved_by = ${user.userId}, approved_at = NOW() 
        WHERE id = ${parseInt(memberId)}
      `;

      // Send approval email
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
    .success-icon { font-size: 48px; color: #10b981; text-align: center; margin-bottom: 20px; }
    .cta-button { display: inline-block; background-color: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .cta-button:hover { background-color: #1d4ed8; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Lyniro</div>
    </div>
    
    <div class="success-icon">✓</div>
    
    <div class="greeting">
      You're approved!
    </div>
    
    <div class="content">
      <p>Your access request to the Lyniro workspace has been approved. You can now sign in and start using the platform.</p>
      
      <a href="https://3000-iuzbtmu87kpjzq3tqwoq9.prev.appgen.com/csm-login" class="cta-button">Sign in now</a>
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
          to: member[0].email,
          subject: "Your Lyniro workspace access has been approved",
          html: approvalEmailHtml,
          type: 'system'
        });
      } catch (emailError) {
        console.error("[Approve Member] Email failed:", emailError);
      }
    } else if (action === 'reject') {
      // Update status to rejected
      await sql`
        UPDATE csm_users 
        SET status = 'rejected', approved_by = ${user.userId}, approved_at = NOW() 
        WHERE id = ${parseInt(memberId)}
      `;

      // Send rejection email
      const rejectionEmailHtml = `
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
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Lyniro</div>
    </div>
    
    <div class="greeting">
      Access Request Declined
    </div>
    
    <div class="content">
      <p>Your request to join the Lyniro workspace has been declined. Please contact your company administrator if you have questions.</p>
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
          to: member[0].email,
          subject: "Your Lyniro workspace access request",
          html: rejectionEmailHtml,
          type: 'system'
        });
      } catch (emailError) {
        console.error("[Approve Member] Email failed:", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Approve Member] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update membership" },
      { status: 500 }
    );
  }
}

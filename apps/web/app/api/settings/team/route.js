import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/lib/session-utils";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get active csm_users members (joined users)
    const members = await sql`
      SELECT id, member_email, member_name, accepted_at 
      FROM team_members 
      WHERE csm_id = ${user.userId} 
      ORDER BY accepted_at DESC
    `;

    // Get pending csm_users (those awaiting approval)
    const pendingMembers = await sql`
      SELECT id, email, first_name, last_name, role, status, created_at 
      FROM csm_users 
      WHERE vendor_id = ${user.organizationId} 
      AND status = 'pending'
      ORDER BY created_at DESC
    `;

    // Combine active and pending members into a single array
    const membersList = Array.isArray(members) ? members : [];
    const pendingList = Array.isArray(pendingMembers) ? pendingMembers : [];

    const allMembers = [
      ...membersList,
      ...pendingList.map(m => ({
        id: m.id,
        member_email: m.email,
        member_name: `${m.first_name || ''} ${m.last_name || ''}`.trim(),
        role: m.role,
        status: m.status,
        invited_at: m.created_at
      }))
    ];

    return NextResponse.json(allMembers);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberEmail, memberName, role = 'member' } = await request.json();

    // Validate role
    if (!['owner', 'manager', 'member'].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be owner, manager, or member" },
        { status: 400 }
      );
    }

    // Only owners can invite as owner or manager
    if ((role === 'owner' || role === 'manager') && user.role !== 'owner') {
      return NextResponse.json(
        { error: "Managers can only invite members" },
        { status: 403 }
      );
    }

    // Generate invite token
    const inviteToken = crypto.randomUUID();

    // Get current user's vendor info
    const vendorInfo = await sql`
      SELECT v.name FROM vendors v WHERE v.id = ${user.organizationId}
    `;

    const inviteResult = await sql`
      INSERT INTO team_members (csm_id, member_email, member_name, role, status, invited_by, invite_token, invited_at) 
      VALUES (${user.userId}, ${memberEmail}, ${memberName}, ${role}, 'pending', ${user.userId}, ${inviteToken}, CURRENT_TIMESTAMP)
      RETURNING id, member_email, member_name, role, status, invited_at
    `;

    // Send invitation email
    const inviteEmailHtml = `
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
    .role-info { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #2563EB; margin: 20px 0; }
    .role-label { font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 5px; }
    .role-value { font-size: 14px; font-weight: 600; color: #333; }
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
    
    <div class="greeting">
      You've been invited to join Lyniro
    </div>
    
    <div class="content">
      <p>${user.email} has invited you to join <strong>${vendorInfo[0]?.name || 'their workspace'}</strong> on Lyniro with the role of <strong>${role.charAt(0).toUpperCase() + role.slice(1)}</strong>.</p>
      
      <div class="role-info">
        <div class="role-label">Your Role</div>
        <div class="role-value">${role.charAt(0).toUpperCase() + role.slice(1)}</div>
      </div>
      
      <p>Click the button below to accept this invitation and create your account.</p>
      
      <a href="https://3000-iuzbtmu87kpjzq3tqwoq9.prev.appgen.com/accept-invite?token=${inviteToken}" class="cta-button">Accept Invitation</a>
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
        to: memberEmail,
        subject: `You've been invited to join ${vendorInfo[0]?.name || 'a workspace'} on Lyniro`,
        html: inviteEmailHtml,
        type: 'system'
      });
    } catch (emailError) {
      console.error("[Team Invite] Email failed:", emailError);
    }

    return NextResponse.json(inviteResult[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId } = await request.json();
    await sql`DELETE FROM team_members WHERE id = ${memberId} AND csm_id = ${user.userId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

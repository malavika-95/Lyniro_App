import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session-utils";

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendorId = user.organizationId;

    // Get the vendor's domain record
    const domainRecord = await sql`
      SELECT resend_domain_id, status FROM vendor_custom_domains WHERE vendor_id = ${vendorId}
    `;

    if (!domainRecord[0]) {
      return NextResponse.json({ error: "No custom domain found" }, { status: 404 });
    }

    const { resend_domain_id, status: currentStatus } = domainRecord[0];

    // If already verified, return immediately
    if (currentStatus === 'verified') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'verified',
          verified: true,
          message: 'Domain is already verified! Emails are sending from your domain.'
        }
      });
    }

    // Call Resend verification endpoint
    const verifyRes = await fetch(`https://api.resend.com/domains/${resend_domain_id}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` }
    });

    const verifyData = await verifyRes.json();

    // Check the status in the response
    const verified = verifyData.verified === true;

    if (verified) {
      // Update database
      await sql`
        UPDATE vendor_custom_domains 
        SET status = 'verified', verified_at = NOW(), updated_at = NOW()
        WHERE vendor_id = ${vendorId}
      `;

      return NextResponse.json({
        success: true,
        data: {
          status: 'verified',
          verified: true,
          message: 'Domain verified! Emails will now send from your domain.'
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        data: {
          status: 'pending',
          verified: false,
          message: 'DNS records not yet detected. This can take up to 48 hours.'
        }
      });
    }
  } catch (error) {
    console.error('[Custom Domain Verify]', error);
    return NextResponse.json({ error: "Failed to verify domain" }, { status: 500 });
  }
}

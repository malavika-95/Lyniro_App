import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session-utils";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendorId = user.organizationId;

    const domainData = await sql`
      SELECT 
        domain,
        status,
        dns_records,
        resend_domain_id,
        verified_at
      FROM vendor_custom_domains
      WHERE vendor_id = ${vendorId}
    `;

    const vendorSettings = await sql`
      SELECT 
        email_send_mode,
        email_display_name,
        email_from_local_part
      FROM vendors
      WHERE id = ${vendorId}
    `;

    const domain = domainData[0] || null;
    const settings = vendorSettings[0] || {};

    return NextResponse.json({
      success: true,
      data: {
        domain: domain?.domain || null,
        status: domain?.status || null,
        dns_records: domain?.dns_records || null,
        resend_domain_id: domain?.resend_domain_id || null,
        verified_at: domain?.verified_at || null,
        email_send_mode: settings.email_send_mode || 'company',
        email_display_name: settings.email_display_name || null,
        email_from_local_part: settings.email_from_local_part || 'noreply'
      }
    });
  } catch (error) {
    console.error('[Custom Domain GET]', error);
    return NextResponse.json({ error: "Failed to fetch domain settings" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - owners only
    if (user.role !== 'owner') {
      return NextResponse.json({ error: "Only owners can add custom domains" }, { status: 403 });
    }

    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({
        error: "Invalid domain format. Enter just the domain like acmecorp.com — no https:// or www."
      }, { status: 400 });
    }

    const vendorId = user.organizationId;

    // Check if domain is already in use by another vendor
    const existing = await sql`SELECT id, vendor_id FROM vendor_custom_domains WHERE domain = ${domain}`;
    if (existing[0] && existing[0].vendor_id !== vendorId) {
      return NextResponse.json({
        error: "This domain is already in use by another account."
      }, { status: 400 });
    }

    // Call Resend API to register the domain
    const resendRes = await fetch('https://api.resend.com/domains', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: domain })
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('[Custom Domain] Resend error:', resendData);
      return NextResponse.json({
        error: "Failed to register domain with email provider. Please try again."
      }, { status: 500 });
    }

    // Store in database
    const result = await sql`
      INSERT INTO vendor_custom_domains (vendor_id, domain, resend_domain_id, status, dns_records)
      VALUES (${vendorId}, ${domain}, ${resendData.id}, 'pending', ${JSON.stringify(resendData.records)})
      ON CONFLICT (vendor_id) DO UPDATE SET
        domain = ${domain},
        resend_domain_id = ${resendData.id},
        status = 'pending',
        dns_records = ${JSON.stringify(resendData.records)},
        verified_at = NULL,
        updated_at = NOW()
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('[Custom Domain POST]', error);
    return NextResponse.json({ error: "Failed to add custom domain" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - owners only
    if (user.role !== 'owner') {
      return NextResponse.json({ error: "Only owners can remove custom domains" }, { status: 403 });
    }

    const vendorId = user.organizationId;

    // Get the domain record
    const domainRecord = await sql`
      SELECT resend_domain_id FROM vendor_custom_domains WHERE vendor_id = ${vendorId}
    `;

    if (!domainRecord[0]) {
      return NextResponse.json({ error: "No custom domain found" }, { status: 404 });
    }

    const resendDomainId = domainRecord[0].resend_domain_id;

    // Call Resend API to delete
    await fetch(`https://api.resend.com/domains/${resendDomainId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` }
    });

    // Delete from database
    await sql`DELETE FROM vendor_custom_domains WHERE vendor_id = ${vendorId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Custom Domain DELETE]', error);
    return NextResponse.json({ error: "Failed to remove custom domain" }, { status: 500 });
  }
}

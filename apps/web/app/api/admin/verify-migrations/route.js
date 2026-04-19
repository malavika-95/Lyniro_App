import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

// Security: Check if request is from localhost or dev mode
function checkSecurity(request) {
  const isDev = process.env.NODE_ENV === "development";
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
  const isLocalhost =
    clientIp === "127.0.0.1" ||
    clientIp === "localhost" ||
    clientIp === "::1";

  return { isDev, clientIp, authorized: isDev || isLocalhost };
}

async function verifyDatabase() {
  const verification = {
    tables: {},
    sampleData: {},
    status: "unknown",
    message: "",
  };

  try {
    // Check table counts
    const tableQueries = [
      { name: "vendors", label: "Vendors" },
      { name: "csm_users", label: "CSM Users" },
      { name: "customers", label: "Customers" },
      { name: "onboarding_plans", label: "Onboarding Plans" },
      { name: "tasks", label: "Tasks" },
      { name: "messages", label: "Messages" },
      { name: "templates", label: "Templates" },
      { name: "email_templates", label: "Email Templates" },
      { name: "api_keys", label: "API Keys" },
      { name: "activity_log", label: "Activity Logs" },
    ];

    for (const table of tableQueries) {
      try {
        const result = await sql.unsafe(
          `SELECT COUNT(*) as count FROM ${table.name}`
        );
        verification.tables[table.label] = result[0]?.count || 0;
      } catch (error) {
        verification.tables[table.label] = "⚠️ Table not found";
      }
    }

    // Check for specific sample data
    try {
      const vendorCount = await sql.unsafe(
        `SELECT COUNT(*) as count FROM vendors WHERE name IN ('Acme Corp', 'TechStart Inc', 'Global Services')`
      );
      verification.sampleData.vendorsLoaded = vendorCount[0]?.count > 0;
    } catch (e) {
      verification.sampleData.vendorsLoaded = false;
    }

    try {
      const csmCount = await sql.unsafe(
        `SELECT COUNT(*) as count FROM csm_users WHERE email IN ('alice@acmecorp.com', 'bob@acmecorp.com', 'david@techstart.com')`
      );
      verification.sampleData.csmUsersLoaded = csmCount[0]?.count > 0;
    } catch (e) {
      verification.sampleData.csmUsersLoaded = false;
    }

    try {
      const planCount = await sql.unsafe(
        `SELECT COUNT(*) as count FROM onboarding_plans WHERE customer_name IN ('Acme Company', 'TechStart Client', 'Global Enterprise')`
      );
      verification.sampleData.plansLoaded = planCount[0]?.count > 0;
    } catch (e) {
      verification.sampleData.plansLoaded = false;
    }

    // Sample CSM users (for login testing)
    try {
      const csms = await sql.unsafe(
        `SELECT email, first_name, role FROM csm_users LIMIT 5`
      );
      verification.sampleData.sampleUsers = csms.map((u) => ({
        email: u.email,
        name: u.first_name,
        role: u.role,
      }));
    } catch (e) {
      verification.sampleData.sampleUsers = [];
    }

    // Determine overall status
    const tableCount = Object.keys(verification.tables).length;
    const readyTables = Object.values(verification.tables).filter(
      (v) => typeof v === "number" && v > 0
    ).length;

    if (readyTables >= 8) {
      verification.status = "ready";
      verification.message = `✅ Database is ready! ${readyTables}/${tableCount} tables populated.`;
    } else if (readyTables >= 5) {
      verification.status = "partial";
      verification.message = `⚠️ Partial setup: ${readyTables}/${tableCount} tables have data.`;
    } else {
      verification.status = "empty";
      verification.message = `❌ Database appears empty or migrations haven't run.`;
    }

    if (verification.sampleData.plansLoaded && verification.sampleData.csmUsersLoaded) {
      verification.message += " Sample data is loaded. Ready to test!";
    }
  } catch (error) {
    console.error("Verification error:", error);
    verification.status = "error";
    verification.message = `Error during verification: ${error.message}`;
  }

  return verification;
}

export async function GET(request) {
  const security = checkSecurity(request);

  if (!security.authorized) {
    return NextResponse.json(
      {
        error: "Unauthorized. This endpoint only works in development or from localhost.",
        clientIp: security.clientIp,
      },
      { status: 403 }
    );
  }

  try {
    const verification = await verifyDatabase();

    return NextResponse.json({
      success: true,
      environment: security.isDev ? "development" : "production",
      clientIp: security.clientIp,
      timestamp: new Date().toISOString(),
      ...verification,
    });
  } catch (error) {
    console.error("Verification endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  // POST just calls GET
  return GET(request);
}

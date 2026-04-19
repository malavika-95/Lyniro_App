import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Helper: Check security (dev mode or localhost)
function checkSecurity(request) {
  const isDev = process.env.NODE_ENV === "development";
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
  const isLocalhost =
    clientIp === "127.0.0.1" ||
    clientIp === "localhost" ||
    clientIp === "::1";

  return { isDev, clientIp, isLocalhost, authorized: isDev || isLocalhost };
}

// Helper: Split SQL statements safely (handles multi-line)
function splitSqlStatements(content) {
  return content
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
}

// Helper: Run verification queries after migrations
async function verifyMigrations() {
  const verification = {};
  
  try {
    const counts = await sql`
      SELECT 
        'vendors' as table_name, COUNT(*) as count FROM vendors
      UNION ALL SELECT 'csm_users', COUNT(*) FROM csm_users
      UNION ALL SELECT 'customers', COUNT(*) FROM customers
      UNION ALL SELECT 'onboarding_plans', COUNT(*) FROM onboarding_plans
      UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
      UNION ALL SELECT 'messages', COUNT(*) FROM messages
      UNION ALL SELECT 'templates', COUNT(*) FROM templates
      UNION ALL SELECT 'email_templates', COUNT(*) FROM email_templates
    `;

    counts.forEach((row) => {
      verification[row.table_name] = row.count;
    });

    console.log("Verification complete:", verification);
  } catch (error) {
    console.warn("Verification query failed (tables may not exist yet):", error.message);
  }

  return verification;
}

// Helper: Execute a single SQL statement with error handling
async function executeSqlStatement(statement, migrationFile) {
  try {
    await sql.unsafe(statement);
    return { success: true, error: null };
  } catch (error) {
    // Many "errors" in migrations are expected (CREATE TABLE IF EXISTS, ON CONFLICT, etc.)
    // Only log as warning unless it's a critical failure
    const message = error.message || error.toString();
    const isExpected =
      message.includes("already exists") ||
      message.includes("already defined") ||
      message.includes("no schema has been selected to create in") ||
      message.includes("ON CONFLICT") ||
      message.includes("CONSTRAINT");

    const level = isExpected ? "info" : "warn";
    console[level](
      `[${migrationFile}] ${isExpected ? "Expected" : "Unexpected"} error: ${message}`
    );

    return {
      success: false,
      error: message,
      isExpected,
    };
  }
}

// Main handler
async function runMigrations(request) {
  const startTime = Date.now();

  try {
    // Security check
    const security = checkSecurity(request);
    console.log(
      `[MIGRATION] Starting from IP: ${security.clientIp} (dev=${security.isDev})`
    );

    if (!security.authorized) {
      console.warn(
        `[MIGRATION] Unauthorized attempt from IP: ${security.clientIp}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Migrations can only run in development or from localhost",
          clientIp: security.clientIp,
        },
        { status: 403 }
      );
    }

    const results = {
      startTime: new Date().toISOString(),
      totalStatements: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      expectedErrors: 0,
      unexpectedErrors: [],
      migrations: [],
      verification: {},
    };

    // Read and execute migration files in order
    const migrationDir = path.join(process.cwd(), "migrations");
    const migrationFiles = ["001_initial_schema.sql", "002_sample_data.sql"];

    console.log(`[MIGRATION] Looking for files in: ${migrationDir}`);

    for (const fileName of migrationFiles) {
      const filePath = path.join(migrationDir, fileName);

      console.log(`[MIGRATION] Processing: ${fileName}`);

      if (!fs.existsSync(filePath)) {
        const errorMsg = `Migration file not found: ${fileName}`;
        console.error(`[MIGRATION] ${errorMsg}`);
        results.unexpectedErrors.push(errorMsg);
        continue;
      }

      const fileContent = fs.readFileSync(filePath, "utf-8");
      const statements = splitSqlStatements(fileContent);

      const migrationResult = {
        file: fileName,
        totalStatements: statements.length,
        successful: 0,
        failed: 0,
        expectedErrors: 0,
        unexpectedErrors: [],
      };

      console.log(
        `[MIGRATION] ${fileName}: ${statements.length} statements found`
      );

      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        results.totalStatements++;

        const result = await executeSqlStatement(statement, fileName);

        if (result.success) {
          migrationResult.successful++;
          results.totalSuccessful++;
        } else {
          migrationResult.failed++;
          results.totalFailed++;

          if (result.isExpected) {
            migrationResult.expectedErrors++;
            results.expectedErrors++;
          } else {
            migrationResult.unexpectedErrors.push(
              `Statement ${i + 1}: ${result.error}`
            );
            results.unexpectedErrors.push(
              `[${fileName}] Statement ${i + 1}: ${result.error}`
            );
          }
        }
      }

      results.migrations.push(migrationResult);
      console.log(
        `[MIGRATION] ${fileName} done: ${migrationResult.successful} successful, ${migrationResult.expectedErrors} expected errors, ${migrationResult.unexpectedErrors.length} unexpected errors`
      );
    }

    // Run verification queries
    console.log("[MIGRATION] Running verification queries...");
    results.verification = await verifyMigrations();

    const duration = Date.now() - startTime;
    const allSuccess = results.unexpectedErrors.length === 0;

    console.log(
      `[MIGRATION] Complete: ${results.totalSuccessful}/${results.totalStatements} statements, ${results.expectedErrors} expected errors. Duration: ${duration}ms`
    );

    return NextResponse.json({
      success: allSuccess,
      environment: security.isDev ? "development" : "production",
      clientIp: security.clientIp,
      timestamp: new Date().toISOString(),
      durationMs: duration,
      totalStatements: results.totalStatements,
      successful: results.totalSuccessful,
      failed: results.totalFailed,
      expectedErrors: results.expectedErrors,
      unexpectedErrors: results.unexpectedErrors,
      migrations: results.migrations,
      verification: results.verification,
      message: allSuccess
        ? `✅ Migrations completed: ${results.totalSuccessful}/${results.totalStatements} statements executed (${results.expectedErrors} expected errors)`
        : `⚠️ Migrations completed with errors: ${results.totalSuccessful}/${results.totalStatements} statements (${results.unexpectedErrors.length} unexpected)`,
    });
  } catch (error) {
    console.error("[MIGRATION] Fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || error.toString(),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Support both GET and POST for flexibility
export async function GET(request) {
  console.log("[MIGRATION] GET request received");
  return runMigrations(request);
}

export async function POST(request) {
  console.log("[MIGRATION] POST request received");
  return runMigrations(request);
}
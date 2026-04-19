# Migration Setup Guide

This document explains how to run the database migrations and populate the Lyniro app with test data.

## Overview

Two migration endpoints are available:
1. **Run Migrations** — Creates all tables and inserts sample data
2. **Verify Migrations** — Checks the database state and reports statistics

Both endpoints are **secure** — they only work in development mode or from localhost.

---

## 🚀 Quick Start

### Step 1: Run the Migrations

Open your browser and visit:
```
http://localhost:3000/api/admin/run-migrations
```

Or use curl:
```bash
curl http://localhost:3000/api/admin/run-migrations
```

Or POST (both GET and POST are supported):
```bash
curl -X POST http://localhost:3000/api/admin/run-migrations
```

### Step 2: Check the Result

The endpoint will return a JSON response like:
```json
{
  "success": true,
  "environment": "development",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "durationMs": 2500,
  "totalStatements": 156,
  "successful": 150,
  "failed": 6,
  "expectedErrors": 6,
  "unexpectedErrors": [],
  "verification": {
    "vendors": 3,
    "csm_users": 5,
    "customers": 3,
    "onboarding_plans": 4,
    "tasks": 9,
    "messages": 8,
    "templates": 4,
    "email_templates": 5
  },
  "message": "✅ Migrations completed: 150/156 statements executed (6 expected errors)"
}
```

### Step 3: Verify the Database (Optional)

Check the database state anytime:
```
http://localhost:3000/api/admin/verify-migrations
```

Response:
```json
{
  "success": true,
  "status": "ready",
  "message": "✅ Database is ready! 8/10 tables populated. Sample data is loaded. Ready to test!",
  "tables": {
    "Vendors": 3,
    "CSM Users": 5,
    "Customers": 3,
    "Onboarding Plans": 4,
    "Tasks": 9,
    "Messages": 8,
    "Templates": 4,
    "Email Templates": 5,
    "API Keys": 3,
    "Activity Logs": 6
  },
  "sampleData": {
    "vendorsLoaded": true,
    "csmUsersLoaded": true,
    "plansLoaded": true,
    "sampleUsers": [
      { "email": "alice@acmecorp.com", "name": "Alice", "role": "owner" },
      { "email": "bob@acmecorp.com", "name": "Bob", "role": "manager" },
      { "email": "charlie@acmecorp.com", "name": "Charlie", "role": "member" }
    ]
  }
}
```

---

## 📋 What Gets Created

### Migration 1: `001_initial_schema.sql`
Creates the complete database schema with:
- **14 tables** covering vendors, users, authentication, plans, tasks, messages, templates, etc.
- **Indexes** for query performance
- **Foreign keys** for referential integrity
- **Constraints** for data validation

### Migration 2: `002_sample_data.sql`
Populates test data:
- **3 vendors**: Acme Corp, TechStart Inc, Global Services
- **5 CSM users** with different roles and companies
- **4 onboarding plans** at various stages (pending, in progress, completed)
- **9 tasks** with different statuses (pending, in progress, completed, blocked)
- **8 messages** showing customer-CSM conversations
- **6 notes** (internal and shared)
- **13 contacts** across different plans
- **4 email templates** for different events
- **3 API keys** for vendor access

---

## 🔐 Security Features

Both endpoints implement multiple security layers:

1. **Development Mode Check**: Only runs if `NODE_ENV === 'development'`
2. **Localhost Restriction**: Can be called from `127.0.0.1`, `localhost`, or `::1`
3. **IP Logging**: Logs the client's IP for audit trail
4. **Authorization Response**: Returns 403 Forbidden if called from unauthorized IP

Example unauthorized response:
```json
{
  "success": false,
  "error": "Migrations can only run in development or from localhost",
  "clientIp": "192.168.1.100"
}
```

---

## 🧪 Test Credentials

After running migrations, use these CSM accounts to log in:

| Email | First Name | Role | Company |
|-------|-----------|------|---------|
| alice@acmecorp.com | Alice | owner | Acme Corp |
| bob@acmecorp.com | Bob | manager | Acme Corp |
| charlie@acmecorp.com | Charlie | member | Acme Corp |
| david@techstart.com | David | owner | TechStart Inc |
| elena@globalservices.com | Elena | owner | Global Services |

All accounts have password hashes pre-set (use the login page to authenticate).

---

## 📊 Sample Plans Available

After migrations run, these plans are ready for testing:

1. **Acme Company** (alice@acmecorp.com)
   - Status: In Progress
   - Stage: User Management
   - Progress: 2/9 tasks complete
   - Go-Live: ~20 days

2. **TechStart Client** (david@techstart.com)
   - Status: Pending
   - Stage: Quick Setup
   - Progress: 1/2 tasks complete
   - Go-Live: ~10 days

3. **Global Enterprise** (elena@globalservices.com)
   - Status: In Progress
   - Stage: Planning & Requirements
   - Progress: 2/9 tasks complete
   - Go-Live: ~45 days

4. **Quick Integration** (bob@acmecorp.com)
   - Status: Completed
   - Duration: 25 days

---

## 🔧 How It Works

### Migration Runner (`/api/admin/run-migrations`)

1. **Security Check**: Verifies request is from localhost or dev mode
2. **File Reading**: Loads both SQL migration files
3. **Statement Parsing**: Splits SQL by `;` and filters comments
4. **Execution Loop**: Runs each statement with individual error handling
5. **Error Classification**: Distinguishes expected errors (table exists) from unexpected
6. **Verification**: Runs COUNT queries on all major tables
7. **Response**: Returns detailed JSON with success status, counts, and any errors

### Verification Endpoint (`/api/admin/verify-migrations`)

1. **Security Check**: Verifies request is from localhost or dev mode
2. **Table Queries**: COUNT(*) on 10 major tables
3. **Sample Data Check**: Looks for specific vendor/user/plan names
4. **Status Determination**: Reports overall database readiness
5. **User Extraction**: Fetches list of available CSM users for login testing

---

## ⚠️ Expected Errors

Some "errors" are expected and safe to ignore:

- **"already exists"** — Table/index already created (idempotent migration)
- **"ON CONFLICT DO NOTHING"** — Duplicate data intentionally skipped
- **"CONSTRAINT"** — Foreign key already exists
- **"already defined"** — Index or constraint already present

The migration runner distinguishes these from real errors and reports them as "expected errors".

---

## 🐛 Troubleshooting

### Migrations return 403 Forbidden
- **Cause**: Your IP is not localhost/127.0.0.1/::1
- **Solution**: Run from localhost or use a tunnel/proxy to localhost

### Migrations return 500 Internal Server Error
- **Cause**: Database connection issue or critical SQL error
- **Solution**: Check the server logs for details. Ensure `DATABASE_URL` is set in `.env`

### Tables not created
- **Cause**: Migration files not found or database read-only
- **Solution**: Verify migration files exist at `/migrations/001_initial_schema.sql` and `002_sample_data.sql`

### Sample data not inserted
- **Cause**: `002_sample_data.sql` failed due to constraints
- **Solution**: Run verification endpoint to check table state. Re-run migrations if needed.

---

## 📝 Manual Alternative

If the endpoints don't work, manually run migrations:

1. Get the database connection string:
   ```javascript
   // In app/api/utils/sql.js or check .env for DATABASE_URL
   ```

2. Connect using psql:
   ```bash
   psql "your_connection_string"
   ```

3. Run the SQL files manually:
   ```bash
   \i /path/to/migrations/001_initial_schema.sql
   \i /path/to/migrations/002_sample_data.sql
   ```

---

## 📚 File Locations

- **Migration Runner**: `/app/api/admin/run-migrations/route.js`
- **Verification Endpoint**: `/app/api/admin/verify-migrations/route.js`
- **Schema Migration**: `/migrations/001_initial_schema.sql`
- **Sample Data**: `/migrations/002_sample_data.sql`
- **This Guide**: `/MIGRATION_SETUP.md`

---

## ✅ Next Steps

After migrations run successfully:

1. ✅ Login as `alice@acmecorp.com` on the dashboard
2. ✅ View the plans list at `/plans`
3. ✅ Click into a plan to see tasks, messages, and notes
4. ✅ Test creating a task, message, or note
5. ✅ Check the activity log entries

Enjoy! 🎉

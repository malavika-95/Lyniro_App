# Migration Integration Guide

This guide shows how to integrate and run the database migrations in your Lyniro app.

## Option 1: Neon Dashboard (Recommended for Initial Setup)

### Step 1: Access Neon Dashboard
1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Select your Lyniro project
3. Click on **SQL Editor**

### Step 2: Run Initial Schema
1. Open `migrations/001_initial_schema.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Execute**
5. Wait for completion (should take 10-30 seconds)

### Step 3: (Optional) Add Sample Data
1. Open `migrations/002_sample_data.sql`
2. Copy and paste into SQL Editor
3. Click **Execute**
4. You should see "INSERT X rows" confirmations

### Step 4: Verify Installation
```sql
-- Run this in Neon SQL Editor to verify:
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public';

SELECT COUNT(*) as index_count FROM pg_indexes 
WHERE schemaname = 'public';
```

Expected results:
- **table_count**: ~40 tables
- **index_count**: ~35 indexes

## Option 2: CLI (psql)

### Prerequisites
```bash
# Install psql if needed
brew install postgresql  # macOS
apt-get install postgresql-client  # Linux
choco install postgresql  # Windows
```

### Run Migrations
```bash
# Get your DATABASE_URL from Neon dashboard
export DATABASE_URL="postgresql://user:password@host:port/dbname"

# Run initial schema
psql $DATABASE_URL < migrations/001_initial_schema.sql

# Run sample data (optional)
psql $DATABASE_URL < migrations/002_sample_data.sql

# Verify
psql $DATABASE_URL -c "SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema = 'public';"
```

## Option 3: Application-Level Migration Runner

### Create Migration Helper
Create `lib/migrations.js`:

```javascript
import sql from "@/app/api/utils/sql";
import fs from "fs";
import path from "path";

export async function runMigrations(schema) {
  console.log("Running database migrations...");
  
  const statements = schema
    .split(";\n")
    .map(s => s.trim())
    .filter(s => s && !s.startsWith("--"));

  let executedCount = 0;
  
  for (const statement of statements) {
    try {
      // Skip comments and empty lines
      if (statement.startsWith("--") || !statement.trim()) continue;
      
      await sql(statement);
      executedCount++;
      console.log(`✓ Executed statement ${executedCount}`);
    } catch (error) {
      console.error("Migration failed:", statement.substring(0, 100));
      throw error;
    }
  }
  
  console.log(`✓ Migrations complete! Executed ${executedCount} statements.`);
  return executedCount;
}
```

### Create API Route
Create `app/api/admin/run-migrations/route.js`:

```javascript
import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import fs from "fs";
import path from "path";

// Only allow from localhost during development
function isAuthorized(request) {
  const isLocalhost = 
    request.headers.get("x-forwarded-for")?.startsWith("127.0.0.1") ||
    request.headers.get("host")?.startsWith("localhost");
  
  return process.env.NODE_ENV === "development" && isLocalhost;
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const schemaPath = path.join(process.cwd(), "migrations", "001_initial_schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");
    
    const statements = schema
      .split(";\n")
      .map(s => s.trim())
      .filter(s => s && !s.startsWith("--"));

    let executedCount = 0;
    
    for (const statement of statements) {
      if (statement.startsWith("--") || !statement.trim()) continue;
      
      try {
        await sql(statement);
        executedCount++;
      } catch (error) {
        // Some statements may fail if already exist (CREATE TABLE IF NOT EXISTS)
        console.warn("Statement skipped (may already exist):", error.message);
      }
    }
    
    return NextResponse.json({
      success: true,
      executedCount,
      message: `Ran ${executedCount} migration statements`
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Call from Admin Panel
Create admin endpoint to trigger migrations:

```jsx
// pages/admin/migrations.jsx
'use client';

import { useState } from 'react';

export default function MigrationsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runMigrations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/run-migrations', {
        method: 'POST'
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Database Migrations</h1>
      
      <button
        onClick={runMigrations}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Running...' : 'Run Migrations'}
      </button>

      {result && (
        <div className="mt-4 p-4 border rounded">
          {result.error ? (
            <p className="text-red-600">Error: {result.error}</p>
          ) : (
            <p className="text-green-600">✓ {result.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

## Option 4: CI/CD Pipeline (Production Recommended)

### GitHub Actions Example
Create `.github/workflows/migrate.yml`:

```yaml
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    
    environment: production
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          # Install psql
          apt-get update
          apt-get install -y postgresql-client
          
          # Run migrations
          psql $DATABASE_URL < migrations/001_initial_schema.sql
          
          # Optional: Run sample data on first setup
          psql $DATABASE_URL < migrations/002_sample_data.sql || true
      
      - name: Verify installation
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          TABLE_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
          echo "Tables created: $TABLE_COUNT"
          
          if [ "$TABLE_COUNT" -lt 35 ]; then
            echo "Warning: Expected ~40 tables"
            exit 1
          fi
```

## Verification Steps

After running migrations, verify everything is working:

### 1. Check Tables
```sql
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';
-- Expected: ~40
```

### 2. Check Indexes
```sql
SELECT COUNT(*) as index_count 
FROM pg_indexes 
WHERE schemaname = 'public';
-- Expected: ~35
```

### 3. Check Foreign Keys
```sql
SELECT COUNT(*) as fk_count 
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
  AND constraint_type = 'FOREIGN KEY';
-- Expected: ~15+
```

### 4. Test Connection
```javascript
// In app
import sql from "@/app/api/utils/sql";

const result = await sql`SELECT COUNT(*) as count FROM csm_users`;
console.log("Database is working:", result);
```

### 5. Check Sample Data (if loaded)
```sql
SELECT * FROM vendors;
-- Expected: 3 rows if sample data loaded

SELECT * FROM csm_users;
-- Expected: 5 rows if sample data loaded
```

## Rollback Strategy

### If Something Goes Wrong

**Option 1: Restore from Neon Backup**
1. Go to Neon Dashboard → Project Settings
2. Click "Backups" 
3. Select a point-in-time restore
4. Restore to previous state

**Option 2: Delete and Restart**
```sql
-- Drop all tables (CAREFUL!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Then run migrations again
```

**Option 3: Manual Cleanup**
```sql
-- Drop individual tables
DROP TABLE IF EXISTS csm_users CASCADE;
DROP TABLE IF EXISTS onboarding_plans CASCADE;
-- ... repeat for each table
```

## Performance Tuning After Migration

### Analyze Tables
```sql
ANALYZE;
```

### Update Statistics
```sql
ANALYZE public;
```

### Check Index Usage
```sql
SELECT 
  schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

## Troubleshooting

### Error: "Relation does not exist"
```
Solution: Schema wasn't created. Run 001_initial_schema.sql first.
```

### Error: "Duplicate key value"
```
Solution: Trying to insert duplicate data. Check UNIQUE constraints:
SELECT * FROM information_schema.constraint_column_usage 
WHERE table_schema = 'public';
```

### Error: "Foreign key violation"
```
Solution: Parent record missing. Verify parent exists:
SELECT * FROM vendors WHERE id = <your_id>;
```

### Slow Queries After Migration
```sql
-- Rebuild indexes
REINDEX DATABASE your_database;

-- Update statistics
ANALYZE;
```

## Maintenance

### Weekly
```sql
-- Optimize query plans
ANALYZE;
```

### Monthly
```sql
-- Clean up old data
DELETE FROM activity_log WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM api_key_usage WHERE created_at < NOW() - INTERVAL '30 days';

-- Vacuum
VACUUM ANALYZE;
```

### Quarterly
```sql
-- Rebuild indexes
REINDEX DATABASE your_database;
```

## Support

For migration issues:

1. **Check Neon Status**: [https://status.neon.tech](https://status.neon.tech)
2. **Review MIGRATION_GUIDE.md** for schema details
3. **Check database logs** in Neon Dashboard
4. **Contact AppGen support** via avatar → "Contact Us"

---

**Next Steps:**
1. Run the migrations using one of the methods above
2. Verify installation (see Verification Steps)
3. Deploy your app to production
4. Monitor database performance

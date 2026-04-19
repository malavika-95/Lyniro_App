# Lyniro Database Migration Guide

## Overview

This migration guide covers the complete database schema for the Lyniro onboarding SaaS platform. The schema is designed for multi-tenant isolation, role-based access control, and high performance.

## File Structure

```
migrations/
├── 001_initial_schema.sql      # Complete database schema
├── MIGRATION_GUIDE.md           # This file
└── 002_sample_data.sql         # (Optional) Sample test data
```

## Running the Migration

### Using Neon Dashboard (Recommended)
1. Log in to [https://console.neon.tech](https://console.neon.tech)
2. Navigate to your Lyniro project
3. Go to the **SQL Editor** tab
4. Copy the entire contents of `001_initial_schema.sql`
5. Paste and execute

### Using CLI (psql)
```bash
psql $DATABASE_URL < migrations/001_initial_schema.sql
```

### Using Node.js (In your app)
```javascript
import sql from "@/app/api/utils/sql";
import fs from "fs";

const schema = fs.readFileSync("migrations/001_initial_schema.sql", "utf-8");
const statements = schema.split(";").filter(s => s.trim());

for (const statement of statements) {
  if (statement.trim()) {
    await sql(statement);
  }
}
```

## Schema Architecture

### Multi-Tenant Structure

The schema uses **vendor isolation** as the primary multi-tenancy model:

```
vendors (root organization)
├── csm_users (team members)
├── templates (onboarding templates)
├── email_templates (email configuration)
├── api_keys (API access)
├── vendor_subscriptions (billing tier)
├── vendor_custom_domains (email sending domains)
└── webhooks (integrations)

onboarding_plans (per customer)
├── tasks (work items)
├── messages (communication)
├── notes (internal notes)
├── contacts (customer contacts)
└── activity_log (audit trail)
```

### Core Entity Relationships

#### 1. **Vendors & Team**
- `vendors` → Root organization
- `csm_users` → Team members (foreign key: vendor_id)
- `csm_sessions` → Active sessions per CSM
- `team_members` → Team collaboration records

#### 2. **Customers & Plans**
- `customers` → Customer users
- `onboarding_plans` → Instances of onboarding
- `templates` → Reusable templates (owned by CSM)
- `template_stages` → Phases in a template
- `template_tasks` → Task definitions

#### 3. **Tasks & Workflow**
- `tasks` → Actual onboarding tasks
- `task_tokens` → Email verification links
- `task_notifications` → Task-level alerts
- `activity_log` → Action history

#### 4. **Communication**
- `messages` → CSM ↔ Customer messages
- `notes` → Internal CSM notes
- `contacts` → Customer contact info
- `notifications` → App notifications

#### 5. **Access & Security**
- `api_keys` → API authentication
- `api_key_usage` → Audit trail
- `token_registry` → Hardened token tracking
- `password_reset_tokens` → Password reset flow

#### 6. **Configuration**
- `email_templates` → Customizable emails
- `vendor_custom_domains` → Domain verification
- `vendor_subscriptions` → Plan tier & limits
- `notification_settings` → User preferences

## Data Types Reference

### Identifiers
- `SERIAL PRIMARY KEY` - Auto-incrementing IDs for most tables
- `TEXT` - UUIDs from Better Auth (user.id, session.id, account.id)
- `VARCHAR(n)` - Fixed-length strings (tokens, codes, hashes)

### Timestamps
- `TIMESTAMP WITHOUT TIME ZONE` - All timestamps use UTC
- Default: `NOW()` for created_at
- Nullable for optional dates (expires_at, completed_at)

### JSON & Complex Data
- `JSONB` - Postgres native JSON (email_templates permissions, webhook events, etc.)
  - Used for: permissions, dns_records, metadata, event payloads

## Performance Indexes

All indexes follow this pattern:
```
CREATE INDEX idx_{table}_{column} ON {table}({column});
```

### Hot Path Indexes (Most Frequently Queried)
- `idx_messages_plan_id` - Fetch messages for a plan
- `idx_tasks_plan_id` - Fetch tasks for a plan
- `idx_tasks_status` - Filter by status (pending, completed, blocked)
- `idx_csm_sessions_expires_at` - Clean up expired sessions
- `idx_api_keys_vendor_id` - Vendor API key lookups

### Security Indexes
- `idx_api_keys_key_prefix` - Validate API key prefix on incoming requests
- `idx_token_registry_type` - Verify token type during validation
- `idx_sessions_expires_at` - Automatic session cleanup

## Foreign Key Constraints

### On Delete Behavior
- **CASCADE**: Deletes children when parent deleted (e.g., delete vendor → delete all templates)
  - vendor → csm_users, templates, api_keys, email_templates, webhooks
  - csm_users → team_members, messages, notes, task_notifications
  - templates → template_stages
  - template_stages → template_tasks
  - tasks → task_notifications, task_tokens

- **SET NULL**: Orphans children (e.g., delete manager → null manager_id)
  - csm_users.manager_id (can be null)

- **RESTRICT**: Prevents deletion if children exist
  - onboarding_plans → tasks, messages, notes

## Security Considerations

### 1. **Multi-Tenant Isolation**
Every query must filter by `vendor_id`:
```sql
-- ✅ CORRECT: Filters by vendor
SELECT * FROM csm_users WHERE vendor_id = $1 AND id = $2;

-- ❌ WRONG: Missing vendor_id filter
SELECT * FROM csm_users WHERE id = $1;
```

### 2. **Role-Based Access**
- Check `csm_users.role` before allowing mutations
- Only OWNER/MANAGER can edit templates, email_templates, api_keys
- MEMBER can view but cannot modify

### 3. **Token Validation**
- Tokens stored as HASH (never plaintext)
- Use `token_registry` to validate before accepting
- Always verify `expires_at` hasn't passed

### 4. **Password Security**
- Passwords stored as HASH (bcrypt minimum)
- Never store plaintext
- Use proper reset flow with `password_reset_tokens`

## Backups & Disaster Recovery

### Automated Backups (Neon)
Neon automatically backs up your database:
1. Daily backups retained for 7 days
2. Point-in-time recovery available
3. Manual backups can be created anytime

### Manual Backup
```bash
pg_dump $DATABASE_URL > backup.sql
```

### Restore from Backup
```bash
psql $DATABASE_URL < backup.sql
```

## Migration Checklist

- [ ] Review schema design and verify it matches your requirements
- [ ] Run migration in development first
- [ ] Test all API routes after migration
- [ ] Verify indexes are created: `SELECT * FROM pg_indexes WHERE tablename LIKE 'csm_%'`
- [ ] Check foreign key constraints: `SELECT * FROM information_schema.table_constraints`
- [ ] Run sample data migration (if using 002_sample_data.sql)
- [ ] Test backup/restore process
- [ ] Document any customizations
- [ ] Schedule regular backups

## Common Queries

### Get all CSMs for a vendor
```sql
SELECT * FROM csm_users WHERE vendor_id = $1 AND role IN ('owner', 'manager');
```

### Get plan with all related data
```sql
SELECT 
  p.*,
  COUNT(DISTINCT t.id) as task_count,
  COUNT(DISTINCT m.id) as message_count,
  COUNT(DISTINCT n.id) as note_count
FROM onboarding_plans p
LEFT JOIN tasks t ON p.id = t.plan_id
LEFT JOIN messages m ON p.id = m.plan_id
LEFT JOIN notes n ON p.id = n.plan_id
WHERE p.vendor_id = $1
GROUP BY p.id;
```

### Find expired sessions
```sql
DELETE FROM csm_sessions WHERE expires_at < NOW();
DELETE FROM "session" WHERE expiresAt < NOW();
```

### Verify API key validity
```sql
SELECT * FROM api_keys 
WHERE key_hash = $1 
  AND is_active = TRUE
  AND (expires_at IS NULL OR expires_at > NOW());
```

### Get activity log for audit
```sql
SELECT * FROM activity_log 
WHERE plan_id = $1 
ORDER BY created_at DESC 
LIMIT 100;
```

## Troubleshooting

### Issue: Foreign Key Constraint Fails
**Cause**: Trying to delete parent with children or inserting non-existent parent

**Solution**: Check ON DELETE behavior and ensure parent exists before inserting child

### Issue: Slow Queries
**Cause**: Missing indexes or querying without indexed columns

**Solution**: Check EXPLAIN plans and create indexes on frequently filtered columns

### Issue: Duplicate Key Error
**Cause**: Unique constraint violated (email, token, key_hash)

**Solution**: Check if record already exists before INSERT

## Table Sizes & Maintenance

### Expected Growth Rates
- `messages` & `activity_log` - Grow fastest (hundreds per plan)
- `tasks` - Moderate (10-50 per plan)
- `csm_users` & `vendors` - Slow (grows with new customers)

### Maintenance Tasks
- [ ] Run `ANALYZE` weekly for query optimization
- [ ] Vacuum old activity logs monthly: `DELETE FROM activity_log WHERE created_at < NOW() - INTERVAL '1 year'`
- [ ] Monitor index sizes: `SELECT * FROM pg_indexes`

## Support & Questions

For questions about the schema:
1. Review this guide first
2. Check the inline SQL comments in 001_initial_schema.sql
3. Refer to the API route implementations for usage examples
4. Contact support via AppGen (avatar → "Contact Us")

---

**Last Updated**: 2024
**Schema Version**: 1.0
**Database**: PostgreSQL 12+

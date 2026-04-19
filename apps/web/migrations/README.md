# Lyniro Database Migrations

This directory contains all SQL migrations for the Lyniro onboarding SaaS platform.

## Files

### 1. **001_initial_schema.sql** (Required)
The complete database schema with all tables, indexes, and foreign keys.

**What it creates:**
- Core tables: vendors, csm_users, customers, users
- Plan management: onboarding_plans, templates, template_stages, template_tasks, tasks
- Communication: messages, notes, contacts
- Configuration: email_templates, api_keys, webhooks
- Security: sessions, accounts, tokens, api_key_usage
- Audit: activity_log, lyniro_audit_log
- Subscriptions: vendor_subscriptions, vendor_custom_domains

**Performance:** 35+ indexes optimized for multi-tenant queries

**Run this first and only once.**

### 2. **002_sample_data.sql** (Optional)
Realistic test data for development and testing.

**What it includes:**
- 3 sample vendors (Acme Corp, TechStart Inc, Global Services)
- 5 CSM users with different roles (owner, manager, member)
- 4 onboarding templates with stages and tasks
- 4 active onboarding plans with tasks, messages, and notes
- Sample email templates, API keys, and webhooks

**Run after 001_initial_schema.sql if you want test data.**

### 3. **MIGRATION_GUIDE.md**
Complete documentation covering:
- Schema design and relationships
- Running migrations
- Multi-tenant isolation patterns
- Performance indexing
- Security considerations
- Common queries and troubleshooting

## Quick Start

### Step 1: Run Initial Schema
```bash
# Via Neon Dashboard
# → SQL Editor → Paste 001_initial_schema.sql → Execute

# Via CLI
psql $DATABASE_URL < migrations/001_initial_schema.sql
```

### Step 2: (Optional) Add Sample Data
```bash
# Via Neon Dashboard
# → SQL Editor → Paste 002_sample_data.sql → Execute

# Via CLI
psql $DATABASE_URL < migrations/002_sample_data.sql
```

### Step 3: Verify Installation
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check indexes
SELECT * FROM pg_indexes WHERE schemaname = 'public';

-- Check foreign keys
SELECT * FROM information_schema.table_constraints 
WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY';
```

## Schema Overview

```
VENDORS (organizations)
├── csm_users (team members)
├── templates (reusable templates)
├── email_templates (customizable emails)
├── api_keys (api access)
├── vendor_subscriptions (billing)
├── vendor_custom_domains (sending domains)
└── webhooks (integrations)

ONBOARDING_PLANS (customer instances)
├── tasks (work items)
├── messages (communication)
├── notes (internal notes)
├── contacts (customer contacts)
└── activity_log (audit trail)

AUTHENTICATION
├── user (better auth users)
├── session (active sessions)
├── account (oauth accounts)
├── csm_sessions (csm active sessions)
├── customers (customer users)
└── password_reset_tokens (reset flow)
```

## Key Design Principles

### 1. Multi-Tenant Safety
- All queries must filter by `vendor_id`
- CSM access controlled via role-based checks
- No cross-vendor data leakage

### 2. Performance
- 35+ indexes on hot paths
- Foreign keys prevent orphaned data
- JSONB for flexible configuration

### 3. Security
- Passwords stored as bcrypt hashes
- Tokens stored as hashes (never plaintext)
- Session expiration enforcement
- Audit logs for compliance

### 4. Scalability
- CASCADE deletes for cleanup
- Proper data types (SERIAL for IDs, TEXT for UUIDs)
- Indexes on frequently filtered columns

## Common Operations

### Create a new vendor
```sql
INSERT INTO vendors (name, email_send_mode) VALUES ('NewCorp', 'lyniro');
```

### Add a CSM user
```sql
INSERT INTO csm_users (email, first_name, last_name, vendor_id, role) 
VALUES ('user@company.com', 'First', 'Last', 1, 'manager');
```

### Create an onboarding plan
```sql
INSERT INTO onboarding_plans (customer_name, company_name, csm_email, vendor_id, template_id) 
VALUES ('John Doe', 'Acme Inc', 'alice@acmecorp.com', 1, 1);
```

### Get all plans for a vendor
```sql
SELECT * FROM onboarding_plans WHERE vendor_id = 1 ORDER BY created_at DESC;
```

### Get plan with related data
```sql
SELECT 
  p.id, p.customer_name, p.stage,
  COUNT(t.id) as task_count,
  COUNT(DISTINCT m.id) as message_count
FROM onboarding_plans p
LEFT JOIN tasks t ON p.id = t.plan_id
LEFT JOIN messages m ON p.id = m.plan_id
WHERE p.vendor_id = 1
GROUP BY p.id
ORDER BY p.created_at DESC;
```

## Maintenance

### Weekly
- Run ANALYZE for query optimization: `ANALYZE;`
- Monitor slow queries in logs

### Monthly
- Archive old activity logs: `DELETE FROM activity_log WHERE created_at < NOW() - INTERVAL '1 year'`
- Review index usage

### Quarterly
- Vacuum tables: `VACUUM ANALYZE;`
- Test backup/restore process

## Troubleshooting

### Issue: "relation does not exist"
**Solution:** Make sure you ran 001_initial_schema.sql first

### Issue: "duplicate key value violates unique constraint"
**Solution:** Table has a UNIQUE constraint. Check if record already exists or use ON CONFLICT clause

### Issue: "foreign key violation"
**Solution:** Parent record doesn't exist. Verify parent is created before inserting child, or check ON DELETE behavior

### Issue: Slow queries
**Solution:** Check if index exists on filtered columns. Use EXPLAIN to analyze query plans.

## Support

For help with migrations:
1. Read MIGRATION_GUIDE.md for detailed information
2. Check the comments in 001_initial_schema.sql
3. Review the API route implementations (app/api/) for usage examples
4. Contact support via AppGen

---

**Last Updated:** 2024  
**Schema Version:** 1.0  
**Database:** PostgreSQL 12+  
**Tables:** 40+  
**Indexes:** 35+

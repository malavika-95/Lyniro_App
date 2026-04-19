# Lyniro Database Migrations — Complete Index

This directory contains the complete database schema and migration files for the Lyniro onboarding SaaS platform.

## 📁 File Structure

```
migrations/
├── README.md                    # Quick start guide (START HERE)
├── INTEGRATION.md               # How to run migrations (4 options)
├── MIGRATION_GUIDE.md           # Complete schema documentation
├── INDEX.md                     # This file
├── 001_initial_schema.sql       # Complete schema (40 tables, 35 indexes)
└── 002_sample_data.sql          # Test data (optional)
```

## 🚀 Quick Start (5 Minutes)

### For First-Time Setup

1. **Open README.md** — Overview of all files
2. **Go to INTEGRATION.md** — Choose your setup method:
   - **Neon Dashboard** (easiest) — Copy/paste SQL
   - **CLI (psql)** — Command line
   - **Application-level** — API route
   - **CI/CD** — GitHub Actions
3. **Run 001_initial_schema.sql** — Creates all tables and indexes
4. **Optionally run 002_sample_data.sql** — Adds test data for development

### For Existing Projects

If you already have a database, migrations use `IF NOT EXISTS` clauses, so they're safe to run multiple times.

## 📚 Documentation Guide

### **README.md** (Start Here)
Quick overview of:
- File descriptions
- Getting started steps
- Schema overview (visual diagram)
- Key design principles
- Common operations with SQL examples

**Best for:** Initial understanding, quick lookup

### **INTEGRATION.md** (How to Run)
Step-by-step guides for:
- **Option 1**: Neon Dashboard (GUI) — Recommended for initial setup
- **Option 2**: CLI with psql — For DevOps/automation
- **Option 3**: Application-level API route — For managed deployments
- **Option 4**: GitHub Actions CI/CD — For production pipelines

Plus:
- Verification steps
- Rollback strategies
- Performance tuning
- Troubleshooting

**Best for:** Actually running the migrations

### **MIGRATION_GUIDE.md** (Deep Dive)
Comprehensive reference covering:
- Schema architecture (14 sections)
- Multi-tenant isolation patterns
- Entity relationships (5 main domains)
- Data types reference
- Foreign key constraints
- Performance indexes (with hot paths identified)
- Security considerations
- Backups & disaster recovery
- Common queries
- Troubleshooting matrix

**Best for:** Understanding the schema, implementing features, debugging

### **001_initial_schema.sql** (The Schema)
Complete SQL file with:
- 40+ tables
- 35+ performance indexes
- 15+ foreign key constraints
- Organized in 14 logical sections:
  1. Vendor & Authentication Core
  2. Session & Authentication
  3. Customers & Authentication
  4. Onboarding & Plans
  5. Tasks & Workflow
  6. Communications
  7. Notifications & Settings
  8. Email & Communication Templates
  9. API Keys & Access Control
  10. Subscriptions & Billing
  11. Custom Domains
  12. Team Management
  13. Webhooks & Integrations
  14. Audit & Logging

**Best for:** Reference, verification, understanding structure

### **002_sample_data.sql** (Test Data)
Realistic test data including:
- 3 sample vendors (Acme Corp, TechStart Inc, Global Services)
- 5 CSM users with different roles
- 4 templates with stages and tasks
- 4 active onboarding plans
- Sample communications, contacts, API keys

**Best for:** Development, testing, demos

## 🎯 Common Tasks

### "I need to set up the database"
1. Open **INTEGRATION.md**
2. Choose your method (Neon Dashboard recommended)
3. Follow the step-by-step guide

### "I want to understand the schema"
1. Read **README.md** schema overview
2. Check **MIGRATION_GUIDE.md** schema architecture
3. Reference **001_initial_schema.sql** for exact definitions

### "How do I query for [something]?"
1. Check **MIGRATION_GUIDE.md** "Common Queries" section
2. Look at examples in **app/api/** routes
3. Review **002_sample_data.sql** for table relationships

### "My migration failed"
1. Check **INTEGRATION.md** "Troubleshooting" section
2. Review **MIGRATION_GUIDE.md** data type and constraint details
3. Look at error logs in Neon Dashboard

### "I want to verify installation"
1. See **INTEGRATION.md** "Verification Steps"
2. Run the SQL checks provided
3. Compare results to expected counts (tables, indexes, FKs)

### "How do I back up and restore?"
1. See **MIGRATION_GUIDE.md** "Backups & Disaster Recovery"
2. For Neon: Use dashboard backups
3. For CLI: Use `pg_dump` and `psql`

## 📊 Schema At a Glance

```
TIER 1 — Core Setup
├── vendors              1 row per customer organization
├── csm_users            Team members (owner, manager, member)
├── customers            End-user customer accounts
└── lyniro_admins        Platform admins

TIER 2 — Authentication
├── csm_sessions         Active CSM logins
├── session              Active user logins (Better Auth)
├── account              OAuth accounts (Better Auth)
├── verification         Email verification (Better Auth)
└── password_reset_tokens Password reset flow

TIER 3 — Templates & Plans
├── templates            Reusable onboarding templates
├── template_stages      Phases within templates
├── template_tasks       Task definitions
└── onboarding_plans     Active customer onboarding instances

TIER 4 — Work & Communication
├── tasks                Actual work items
├── messages             CSM ↔ Customer communication
├── notes                Internal CSM notes
├── contacts             Customer contact info
├── activity_log         Audit trail of all actions
└── task_notifications   Task alerts

TIER 5 — Configuration
├── email_templates      Customizable email templates
├── api_keys             API authentication
├── vendor_subscriptions  Billing tier
├── vendor_custom_domains Domain verification
├── notification_settings User preferences
└── webhooks             Integration endpoints

TIER 6 — Audit & Compliance
├── lyniro_audit_log     Admin action audit log
├── token_registry       Hardened token tracking
└── api_key_usage        API call audit trail
```

## 🔧 Performance Statistics

- **Tables**: 40+
- **Indexes**: 35+
- **Foreign Keys**: 15+
- **Peak columns in table**: 20 (csm_users)
- **Smallest table**: csm_availability_status (3 columns)
- **Most connected**: onboarding_plans (6 incoming FKs)

## 🔐 Security Features

1. **Multi-Tenant Isolation**
   - All queries must filter by vendor_id
   - No cross-vendor data access

2. **Password Security**
   - Bcrypt hashing (minimum 10 rounds)
   - Never stored in plaintext

3. **Token Security**
   - Tokens stored as hashes
   - Expiration enforcement
   - token_registry for validation

4. **Access Control**
   - Role-based (OWNER, MANAGER, MEMBER)
   - Per-action authorization
   - Impersonation logging

5. **Audit Trail**
   - activity_log for plan/task changes
   - lyniro_audit_log for admin actions
   - api_key_usage for API access
   - csm_sessions for login tracking

## 📈 Scaling Considerations

### Indexes Optimized For:
- Fast vendor lookups: `idx_csm_users_vendor_id`
- Plan queries: `idx_tasks_plan_id`, `idx_messages_plan_id`
- Task filtering: `idx_tasks_status`
- Session cleanup: `idx_sessions_expires_at`
- API validation: `idx_api_keys_key_prefix`

### Data Retention Recommendations:
- Keep activity_log for 1 year
- Keep api_key_usage for 3 months
- Keep sessions (auto-cleanup at expires_at)
- Keep webhooks delivery logs as needed

### Estimated Sizes (100 vendors, 50 plans each):
- tasks: ~25,000 rows
- messages: ~100,000 rows (4 per task)
- activity_log: ~250,000 rows (10 per task)
- Database size: ~50-100 MB

## 🆘 Support Resources

### Built-in Checks
1. Run verification SQL in **INTEGRATION.md**
2. Monitor slow queries: `EXPLAIN ANALYZE SELECT ...`
3. Check index usage: `SELECT * FROM pg_stat_user_indexes`

### Documentation
1. **README.md** — Quick overview
2. **MIGRATION_GUIDE.md** — Detailed reference
3. **001_initial_schema.sql** — Source of truth
4. **app/api/** routes — Real-world usage examples

### External Help
- **Neon Dashboard**: Check database logs
- **PostgreSQL Docs**: [postgresql.org/docs](https://www.postgresql.org/docs/)
- **AppGen Support**: Click avatar → "Contact Us"

## 📋 Checklist For Deployment

- [ ] Read **README.md** to understand structure
- [ ] Choose integration method in **INTEGRATION.md**
- [ ] Run **001_initial_schema.sql**
- [ ] Run verification steps from **INTEGRATION.md**
- [ ] Optionally load **002_sample_data.sql** for testing
- [ ] Test API routes to confirm schema is correct
- [ ] Set up backup strategy (see **MIGRATION_GUIDE.md**)
- [ ] Document any customizations
- [ ] Deploy app to production

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial schema with 40 tables, 35 indexes |

## 📞 Next Steps

1. **Not sure where to start?** → Open **README.md**
2. **Ready to run migrations?** → Open **INTEGRATION.md**
3. **Need schema details?** → Open **MIGRATION_GUIDE.md**
4. **Looking for specific queries?** → Check **001_initial_schema.sql** comments or app/api routes

---

**Last Updated**: 2024  
**Schema Version**: 1.0  
**Database**: PostgreSQL 12+  
**Status**: Production Ready ✓

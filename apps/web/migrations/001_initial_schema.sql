-- ============================================================================
-- LYNIRO COMPLETE DATABASE SCHEMA MIGRATION
-- ============================================================================
-- This migration creates all tables, indexes, and foreign keys for the
-- Lyniro onboarding SaaS platform. Designed for multi-tenant safety and
-- optimal query performance.
-- ============================================================================

-- ============================================================================
-- SECTION 1: VENDOR & AUTHENTICATION CORE
-- ============================================================================

-- Vendors (Workspace owners/organizations)
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  email_send_mode VARCHAR(20) DEFAULT 'lyniro',
  email_display_name VARCHAR(100),
  email_from_local_part VARCHAR(50),
  UNIQUE(name)
);

-- CSM Users (Team members/staff)
CREATE TABLE IF NOT EXISTS csm_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  password_hash TEXT,
  company_name TEXT,
  company_logo_url TEXT,
  brand_color VARCHAR(7),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  role VARCHAR(50) DEFAULT 'member',
  manager_id INTEGER REFERENCES csm_users(id),
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  impersonated_by_id INTEGER REFERENCES csm_users(id),
  active_plans_count INTEGER DEFAULT 0,
  users_count INTEGER DEFAULT 0,
  api_usage_this_month INTEGER DEFAULT 0,
  subscription_updated_at TIMESTAMP WITHOUT TIME ZONE,
  session_uuid TEXT,
  status VARCHAR(50) DEFAULT 'active',
  approved_by INTEGER REFERENCES lyniro_admins(id),
  approved_at TIMESTAMP WITHOUT TIME ZONE,
  bio TEXT,
  avatar_url TEXT,
  theme_preference VARCHAR(20) DEFAULT 'system',
  email_display_name VARCHAR(100)
);

-- Lyniro Admins (Platform admins)
CREATE TABLE IF NOT EXISTS lyniro_admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITHOUT TIME ZONE
);

-- Users (Authentication via Better Auth)
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  emailVerified BOOLEAN DEFAULT FALSE,
  image TEXT,
  createdAt TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 2: SESSION & AUTHENTICATION
-- ============================================================================

-- CSM Sessions
CREATE TABLE IF NOT EXISTS csm_sessions (
  id SERIAL PRIMARY KEY,
  csm_user_id INTEGER NOT NULL REFERENCES csm_users(id) ON DELETE CASCADE,
  session_uuid VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  last_active_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Better Auth Sessions
CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expiresAt TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Better Auth Accounts
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt TIMESTAMP WITHOUT TIME ZONE,
  refreshTokenExpiresAt TIMESTAMP WITHOUT TIME ZONE,
  scope TEXT,
  password TEXT,
  createdAt TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Better Auth Verification
CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  createdAt TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Lyniro Admin Sessions
CREATE TABLE IF NOT EXISTS lyniro_admin_sessions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES lyniro_admins(id) ON DELETE CASCADE,
  session_uuid VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  last_active_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 3: CUSTOMERS & AUTHENTICATION
-- ============================================================================

-- Customers (End users using the platform)
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  plan_id INTEGER,
  is_password_changed BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMP WITHOUT TIME ZONE,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  used_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- OTP Codes
CREATE TABLE IF NOT EXISTS otp_codes (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  used_at TIMESTAMP WITHOUT TIME ZONE,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT
);

-- ============================================================================
-- SECTION 4: ONBOARDING & PLANS
-- ============================================================================

-- Onboarding Plans (Customer onboarding instances)
CREATE TABLE IF NOT EXISTS onboarding_plans (
  id SERIAL PRIMARY KEY,
  customer_name TEXT,
  company_name TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  csm_email TEXT,
  vendor_id TEXT,
  customer_email TEXT NOT NULL,
  magic_link_created_at TIMESTAMP WITHOUT TIME ZONE,
  magic_link_expires_at TIMESTAMP WITHOUT TIME ZONE,
  template_id INTEGER,
  go_live_date TIMESTAMP WITHOUT TIME ZONE,
  stage TEXT DEFAULT 'pending'
);

-- Templates (Reusable onboarding templates)
CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  csm_id INTEGER NOT NULL REFERENCES csm_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  estimated_duration_days INTEGER,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
  UNIQUE(csm_id, name)
);

-- Template Stages (Phases within a template)
CREATE TABLE IF NOT EXISTS template_stages (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Template Tasks (Task definitions within stages)
CREATE TABLE IF NOT EXISTS template_tasks (
  id SERIAL PRIMARY KEY,
  stage_id INTEGER NOT NULL REFERENCES template_stages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  due_day INTEGER,
  priority TEXT,
  position INTEGER,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 5: TASKS & WORKFLOW
-- ============================================================================

-- Tasks (Actual onboarding tasks in a plan)
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITHOUT TIME ZONE,
  blocked_reason TEXT,
  task_id INTEGER,
  stage_id INTEGER,
  custom_task BOOLEAN DEFAULT FALSE
);

-- Task Notifications
CREATE TABLE IF NOT EXISTS task_notifications (
  id SERIAL PRIMARY KEY,
  csm_id INTEGER NOT NULL REFERENCES csm_users(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITHOUT TIME ZONE
);

-- Task Tokens (Email verification tokens for task completion)
CREATE TABLE IF NOT EXISTS task_tokens (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  customer_id INTEGER,
  customer_email TEXT,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  used_at TIMESTAMP WITHOUT TIME ZONE
);

-- Email Tokens (General email action tokens)
CREATE TABLE IF NOT EXISTS email_tokens (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  plan_id INTEGER,
  task_id INTEGER,
  action_type TEXT,
  customer_email TEXT,
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  used_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 6: COMMUNICATIONS
-- ============================================================================

-- Messages (CSM <-> Customer communication)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL,
  csm_id INTEGER NOT NULL REFERENCES csm_users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  csm_read_at TIMESTAMP WITHOUT TIME ZONE
);

-- Notes (Internal CSM notes on plans)
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL,
  csm_id INTEGER NOT NULL REFERENCES csm_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  visibility TEXT DEFAULT 'internal',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Contacts (Customer contacts tracked in plan)
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- CSM Message Notifications
CREATE TABLE IF NOT EXISTS csm_message_notifications (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  csm_id INTEGER NOT NULL REFERENCES csm_users(id) ON DELETE CASCADE,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITHOUT TIME ZONE
);

-- ============================================================================
-- SECTION 7: NOTIFICATIONS & SETTINGS
-- ============================================================================

-- Notification Settings (CSM preferences)
CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  csm_id INTEGER NOT NULL UNIQUE REFERENCES csm_users(id) ON DELETE CASCADE,
  email_on_blocked_task BOOLEAN DEFAULT TRUE,
  email_on_completion BOOLEAN DEFAULT TRUE,
  daily_summary_email BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Notifications (General app notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER,
  recipient_type TEXT,
  recipient_email TEXT,
  event_type TEXT,
  subject TEXT,
  body TEXT,
  sent_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- CSM Availability Status
CREATE TABLE IF NOT EXISTS csm_availability_status (
  id SERIAL PRIMARY KEY,
  csm_id INTEGER NOT NULL UNIQUE REFERENCES csm_users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'available',
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 8: EMAIL & COMMUNICATION TEMPLATES
-- ============================================================================

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  template_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  body_html TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  preview_text VARCHAR(255),
  from_name VARCHAR(100),
  reply_to VARCHAR(255),
  updated_by INTEGER REFERENCES csm_users(id)
);

-- ============================================================================
-- SECTION 9: API KEYS & ACCESS CONTROL
-- ============================================================================

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(10),
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  tier_required VARCHAR(50),
  last_used_at TIMESTAMP WITHOUT TIME ZONE,
  expires_at TIMESTAMP WITHOUT TIME ZONE,
  created_by INTEGER REFERENCES csm_users(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITHOUT TIME ZONE,
  revoked_by INTEGER REFERENCES csm_users(id),
  permissions JSONB DEFAULT '{}'
);

-- API Key Usage Logs
CREATE TABLE IF NOT EXISTS api_key_usage (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Token Registry (Hardened token tracking)
CREATE TABLE IF NOT EXISTS token_registry (
  id SERIAL PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  related_id INTEGER,
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  used_at TIMESTAMP WITHOUT TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 10: SUBSCRIPTIONS & BILLING
-- ============================================================================

-- Vendor Subscriptions
CREATE TABLE IF NOT EXISTS vendor_subscriptions (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL UNIQUE REFERENCES vendors(id) ON DELETE CASCADE,
  tier VARCHAR(50) NOT NULL,
  plan_limit INTEGER,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 11: CUSTOM DOMAINS
-- ============================================================================

-- Vendor Custom Domains
CREATE TABLE IF NOT EXISTS vendor_custom_domains (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL UNIQUE,
  resend_domain_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  dns_records JSONB DEFAULT '{}',
  verified_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 12: TEAM MANAGEMENT
-- ============================================================================

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  csm_id INTEGER NOT NULL REFERENCES csm_users(id) ON DELETE CASCADE,
  member_email TEXT NOT NULL,
  member_name TEXT,
  role TEXT,
  invited_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pending',
  invited_by INTEGER REFERENCES csm_users(id),
  invite_token VARCHAR(255)
);

-- ============================================================================
-- SECTION 13: WEBHOOKS & INTEGRATIONS
-- ============================================================================

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  url VARCHAR(255) NOT NULL,
  events JSONB DEFAULT '[]',
  secret VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Webhook Delivery Logs
CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event VARCHAR(100),
  status_code INTEGER,
  response_text TEXT,
  attempt_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 14: AUDIT & LOGGING
-- ============================================================================

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER,
  task_id INTEGER,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Lyniro Audit Log
CREATE TABLE IF NOT EXISTS lyniro_audit_log (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES lyniro_admins(id),
  admin_email VARCHAR(255),
  action VARCHAR(255) NOT NULL,
  target_type VARCHAR(100),
  target_id INTEGER,
  target_email VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Vendor indexes
CREATE INDEX idx_vendors_name ON vendors(name);

-- CSM User indexes
CREATE INDEX idx_csm_users_vendor_id ON csm_users(vendor_id);
CREATE INDEX idx_csm_users_email ON csm_users(email);
CREATE INDEX idx_csm_users_role ON csm_users(role);
CREATE INDEX idx_csm_users_manager_id ON csm_users(manager_id);

-- Session indexes
CREATE INDEX idx_csm_sessions_csm_user_id ON csm_sessions(csm_user_id);
CREATE INDEX idx_csm_sessions_expires_at ON csm_sessions(expires_at);
CREATE INDEX idx_sessions_user_id ON "session"(userId);
CREATE INDEX idx_sessions_expires_at ON "session"(expiresAt);

-- Customer indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_plan_id ON customers(plan_id);

-- Plan indexes
CREATE INDEX idx_onboarding_plans_vendor_id ON onboarding_plans(vendor_id);
CREATE INDEX idx_onboarding_plans_customer_email ON onboarding_plans(customer_email);
CREATE INDEX idx_onboarding_plans_template_id ON onboarding_plans(template_id);

-- Template indexes
CREATE INDEX idx_templates_vendor_id ON templates(vendor_id);
CREATE INDEX idx_templates_csm_id ON templates(csm_id);
CREATE INDEX idx_template_stages_template_id ON template_stages(template_id);
CREATE INDEX idx_template_tasks_stage_id ON template_tasks(stage_id);

-- Task indexes
CREATE INDEX idx_tasks_plan_id ON tasks(plan_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_task_notifications_csm_id ON task_notifications(csm_id);
CREATE INDEX idx_task_tokens_plan_id ON task_tokens(plan_id);
CREATE INDEX idx_task_tokens_token ON task_tokens(token);

-- Message indexes
CREATE INDEX idx_messages_plan_id ON messages(plan_id);
CREATE INDEX idx_messages_csm_id ON messages(csm_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);
CREATE INDEX idx_notes_plan_id ON notes(plan_id);
CREATE INDEX idx_notes_csm_id ON notes(csm_id);

-- Notification indexes
CREATE INDEX idx_notification_settings_csm_id ON notification_settings(csm_id);
CREATE INDEX idx_notifications_recipient_email ON notifications(recipient_email);

-- API Key indexes
CREATE INDEX idx_api_keys_vendor_id ON api_keys(vendor_id);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_key_usage_api_key_id ON api_key_usage(api_key_id);
CREATE INDEX idx_api_key_usage_created_at ON api_key_usage(created_at);

-- Token indexes
CREATE INDEX idx_token_registry_type ON token_registry(type);
CREATE INDEX idx_token_registry_expires_at ON token_registry(expires_at);

-- Email Template indexes
CREATE INDEX idx_email_templates_vendor_id ON email_templates(vendor_id);
CREATE INDEX idx_email_templates_type ON email_templates(template_type);

-- Subscription indexes
CREATE INDEX idx_vendor_subscriptions_vendor_id ON vendor_subscriptions(vendor_id);
CREATE INDEX idx_vendor_subscriptions_tier ON vendor_subscriptions(tier);

-- Custom Domain indexes
CREATE INDEX idx_vendor_custom_domains_vendor_id ON vendor_custom_domains(vendor_id);
CREATE INDEX idx_vendor_custom_domains_domain ON vendor_custom_domains(domain);

-- Team Member indexes
CREATE INDEX idx_team_members_csm_id ON team_members(csm_id);
CREATE INDEX idx_team_members_member_email ON team_members(member_email);

-- Webhook indexes
CREATE INDEX idx_webhooks_vendor_id ON webhooks(vendor_id);
CREATE INDEX idx_webhook_delivery_logs_webhook_id ON webhook_delivery_logs(webhook_id);

-- Activity Log indexes
CREATE INDEX idx_activity_log_plan_id ON activity_log(plan_id);
CREATE INDEX idx_activity_log_task_id ON activity_log(task_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);

-- Audit Log indexes
CREATE INDEX idx_lyniro_audit_log_admin_id ON lyniro_audit_log(admin_id);
CREATE INDEX idx_lyniro_audit_log_target_type ON lyniro_audit_log(target_type);
CREATE INDEX idx_lyniro_audit_log_created_at ON lyniro_audit_log(created_at);

-- ============================================================================
-- FOREIGN KEY REFERENCES (Additional constraints for data integrity)
-- ============================================================================

-- Tasks foreign key (if not already set)
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_plan 
  FOREIGN KEY (plan_id) REFERENCES onboarding_plans(id) ON DELETE CASCADE;

-- Contacts foreign key
ALTER TABLE contacts ADD CONSTRAINT fk_contacts_plan 
  FOREIGN KEY (plan_id) REFERENCES onboarding_plans(id) ON DELETE CASCADE;

-- Messages foreign key
ALTER TABLE messages ADD CONSTRAINT fk_messages_plan 
  FOREIGN KEY (plan_id) REFERENCES onboarding_plans(id) ON DELETE CASCADE;

-- Notes foreign key
ALTER TABLE notes ADD CONSTRAINT fk_notes_plan 
  FOREIGN KEY (plan_id) REFERENCES onboarding_plans(id) ON DELETE CASCADE;

-- Activity Log foreign keys
ALTER TABLE activity_log ADD CONSTRAINT fk_activity_log_task 
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All tables, indexes, and foreign keys have been created.
-- The database is now ready for the Lyniro application.
-- ============================================================================

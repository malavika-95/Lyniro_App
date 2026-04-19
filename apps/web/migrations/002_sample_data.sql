-- ============================================================================
-- LYNIRO SAMPLE DATA FOR TESTING
-- ============================================================================
-- This migration populates the database with realistic test data.
-- Run AFTER 001_initial_schema.sql
-- ============================================================================

-- STEP 1: Create sample vendors
INSERT INTO vendors (name, email_send_mode, email_display_name, email_from_local_part) VALUES
('Acme Corp', 'lyniro', 'Acme Customer Success', 'hello'),
('TechStart Inc', 'lyniro', 'TechStart Onboarding', 'onboarding'),
('Global Services', 'lyniro', 'Global Success Team', 'support')
ON CONFLICT (name) DO NOTHING;

-- STEP 2: Create sample Lyniro admins
INSERT INTO lyniro_admins (email, password_hash, first_name, last_name, role, is_active) VALUES
('admin@lyniro.com', '$2b$10$qJxbVbVYqJxbVbVYqJxbVeF8K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'Lyniro', 'Admin', 'admin', TRUE),
('moderator@lyniro.com', '$2b$10$qJxbVbVYqJxbVbVYqJxbVeF8K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'Mod', 'Team', 'moderator', TRUE)
ON CONFLICT (email) DO NOTHING;

-- STEP 3: Create sample users (Better Auth)
INSERT INTO "user" (id, name, email, emailVerified) VALUES
('user_1', 'Sarah Johnson', 'sarah@acmecorp.com', TRUE),
('user_2', 'Mike Chen', 'mike@techstart.com', TRUE),
('user_3', 'Emma Watson', 'emma@globalservices.com', TRUE)
ON CONFLICT (id) DO NOTHING;

-- STEP 4: Create sample CSM users
INSERT INTO csm_users (
  email, first_name, last_name, password_hash, company_name, 
  vendor_id, role, status, active_plans_count, users_count
) VALUES
('alice@acmecorp.com', 'Alice', 'Williams', '$2b$10$qJxbVbVYqJxbVbVYqJxbVeF8K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'Acme Corp', 1, 'owner', 'active', 15, 45),
('bob@acmecorp.com', 'Bob', 'Smith', '$2b$10$qJxbVbVYqJxbVbVYqJxbVeF8K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'Acme Corp', 1, 'manager', 'active', 8, 24),
('charlie@acmecorp.com', 'Charlie', 'Brown', '$2b$10$qJxbVbVYqJxbVbVYqJxbVeF8K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'Acme Corp', 1, 'member', 'active', 3, 9),
('david@techstart.com', 'David', 'Lee', '$2b$10$qJxbVbVYqJxbVbVYqJxbVeF8K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'TechStart Inc', 2, 'owner', 'active', 12, 36),
('elena@globalservices.com', 'Elena', 'Rodriguez', '$2b$10$qJxbVbVYqJxbVbVYqJxbVeF8K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'Global Services', 3, 'owner', 'active', 20, 60)
ON CONFLICT (email) DO NOTHING;

-- STEP 5: Create sample vendor subscriptions
INSERT INTO vendor_subscriptions (vendor_id, tier, plan_limit) VALUES
(1, 'professional', 50),
(2, 'starter', 20),
(3, 'professional', 50)
ON CONFLICT (vendor_id) DO NOTHING;

-- STEP 6: Create sample templates
INSERT INTO templates (csm_id, name, description, estimated_duration_days, status, vendor_id) VALUES
(1, 'Standard SaaS Onboarding', 'Complete onboarding for SaaS products', 30, 'active', 1),
(1, 'Enterprise Implementation', 'Full enterprise setup with training', 60, 'active', 1),
(4, 'Quick Start', 'Fast onboarding for simple products', 14, 'active', 2),
(5, 'Premium Support Setup', 'Premium customer onboarding', 45, 'active', 3);

-- STEP 7: Create sample template stages
INSERT INTO template_stages (template_id, stage_number, name, description, position) VALUES
(1, 1, 'Setup & Configuration', 'Initial setup and system configuration', 1),
(1, 2, 'User Management', 'Create users and set permissions', 2),
(1, 3, 'Data Migration', 'Import existing data', 3),
(1, 4, 'Training & Go-Live', 'Train users and launch', 4),
(2, 1, 'Planning & Requirements', 'Gather business requirements', 1),
(2, 2, 'Implementation', 'Build and configure solution', 2),
(2, 3, 'Testing & QA', 'Comprehensive testing', 3),
(2, 4, 'Training & Deployment', 'Train team and deploy to production', 4),
(3, 1, 'Quick Setup', 'Basic system setup', 1),
(3, 2, 'Launch', 'Deploy and go live', 2),
(4, 1, 'Discovery Call', 'Understand customer needs', 1),
(4, 2, 'Implementation', 'Set up custom features', 2),
(4, 3, 'Optimization', 'Tune and optimize', 3);

-- STEP 8: Create sample template tasks
INSERT INTO template_tasks (stage_id, name, description, assigned_to, due_day, priority, position) VALUES
-- Template 1 Tasks
(1, 'Create admin account', 'Set up main admin user', 'csm', 1, 'high', 1),
(1, 'Configure system settings', 'Set timezone, language, locale', 'customer', 2, 'high', 2),
(2, 'Create user accounts', 'Set up all team member accounts', 'csm', 5, 'high', 1),
(2, 'Set role permissions', 'Configure user roles and permissions', 'customer', 7, 'medium', 2),
(3, 'Prepare data for migration', 'Export and format existing data', 'customer', 10, 'high', 1),
(3, 'Execute migration', 'Import data into system', 'csm', 12, 'high', 2),
(4, 'Conduct training session', 'Live training for all users', 'csm', 25, 'high', 1),
(4, 'Go-live', 'Switch to production', 'csm', 30, 'high', 2),
-- Template 2 Tasks
(5, 'Schedule kickoff meeting', 'Meet with key stakeholders', 'csm', 1, 'high', 1),
(5, 'Gather requirements', 'Document business needs', 'customer', 5, 'high', 2),
(6, 'Design solution architecture', 'Plan technical implementation', 'csm', 10, 'high', 1),
(6, 'Build custom features', 'Develop solution', 'csm', 25, 'high', 2),
(7, 'Conduct QA testing', 'Test all features', 'customer', 35, 'high', 1),
(7, 'Fix bugs and issues', 'Resolve any problems', 'csm', 40, 'medium', 2),
(8, 'Train super users', 'Advanced training program', 'csm', 45, 'high', 1),
(8, 'Deploy to production', 'Final deployment', 'csm', 60, 'high', 2),
-- Template 3 Tasks
(9, 'Complete setup wizard', 'Run initial setup', 'customer', 1, 'high', 1),
(10, 'Launch application', 'Go live', 'csm', 14, 'high', 1),
-- Template 4 Tasks
(11, 'Schedule discovery call', 'Initial consultation', 'csm', 1, 'high', 1),
(12, 'Build custom integrations', 'Implement custom features', 'csm', 20, 'high', 1),
(13, 'Optimize performance', 'Fine-tune system', 'csm', 30, 'medium', 1);

-- STEP 9: Create sample customers
INSERT INTO customers (email, password_hash) VALUES
('john.doe@example.com', '$2b$10$qJxbVbVYqJxbVbVYqJxbVeF8K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z'),
('jane.smith@example.com', '$2b$10$qJxbVbVYqJxbVbVYqJxbVeF8K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z'),
('robert.johnson@example.com', '$2b$10$qJxbVbVYqJxbVbVYqJxbVeF8K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z')
ON CONFLICT (email) DO NOTHING;

-- STEP 10: Create sample onboarding plans (17 total for Acme)
INSERT INTO onboarding_plans (
  customer_name, company_name, csm_email, vendor_id, customer_email,
  template_id, stage, go_live_date
) VALUES
('Acme Company', 'Acme Corp Inc', 'alice@acmecorp.com', '1', 'contact@acmecorp.com', 1, 'in_progress', NOW() + INTERVAL '20 days'),
('Beta Client', 'Beta Systems LLC', 'alice@acmecorp.com', '1', 'hello@beta.com', 1, 'in_progress', NOW() + INTERVAL '15 days'),
('DataFlow Inc', 'DataFlow Technologies', 'bob@acmecorp.com', '1', 'ops@dataflow.com', 2, 'in_progress', NOW() + INTERVAL '35 days'),
('CloudNext Solutions', 'CloudNext Corp', 'bob@acmecorp.com', '1', 'contact@cloudnext.com', 1, 'pending', NOW() + INTERVAL '10 days'),
('Enterprise Pro', 'Enterprise Professional Services', 'alice@acmecorp.com', '1', 'hello@entpro.com', 2, 'in_progress', NOW() + INTERVAL '40 days'),
('StartUp Labs', 'StartUp Labs Inc', 'charlie@acmecorp.com', '1', 'founders@startuplabs.com', 1, 'pending', NOW() + INTERVAL '25 days'),
('Digital Minds', 'Digital Minds Agency', 'bob@acmecorp.com', '1', 'team@digitalminds.com', 1, 'completed', NOW() - INTERVAL '2 days'),
('Nexus Global', 'Nexus Global Solutions', 'alice@acmecorp.com', '1', 'info@nexusglobal.com', 2, 'in_progress', NOW() + INTERVAL '50 days'),
('SecureVault Corp', 'SecureVault Technologies', 'charlie@acmecorp.com', '1', 'admin@securevault.com', 1, 'in_progress', NOW() + INTERVAL '12 days'),
('InnovateTech', 'InnovateTech Solutions', 'alice@acmecorp.com', '1', 'contact@innovatetech.com', 1, 'pending', NOW() + INTERVAL '8 days'),
('GrowthHQ', 'GrowthHQ LLC', 'bob@acmecorp.com', '1', 'hello@growthhq.com', 2, 'in_progress', NOW() + INTERVAL '30 days'),
('VisionaryAI', 'VisionaryAI Inc', 'alice@acmecorp.com', '1', 'team@visionaryai.com', 1, 'completed', NOW() - INTERVAL '10 days'),
('MetaLearn', 'MetaLearn Systems', 'charlie@acmecorp.com', '1', 'contact@metalearn.com', 1, 'in_progress', NOW() + INTERVAL '18 days'),
('PrecisionWorks', 'PrecisionWorks Corp', 'alice@acmecorp.com', '1', 'hello@precisionworks.com', 2, 'pending', NOW() + INTERVAL '28 days'),
('TechVantage', 'TechVantage Solutions', 'bob@acmecorp.com', '1', 'ops@techvantage.com', 1, 'in_progress', NOW() + INTERVAL '22 days'),
('QuantumLeap', 'QuantumLeap Technologies', 'alice@acmecorp.com', '1', 'contact@quantumleap.com', 2, 'in_progress', NOW() + INTERVAL '42 days'),
('FutureSoft', 'FutureSoft Innovations', 'charlie@acmecorp.com', '1', 'team@futuresoft.com', 1, 'pending', NOW() + INTERVAL '14 days'),
('TechStart Client', 'TechStart Solutions', 'david@techstart.com', '2', 'hello@techstart.com', 3, 'pending', NOW() + INTERVAL '10 days'),
('Global Enterprise', 'Global Enterprises LLC', 'elena@globalservices.com', '3', 'info@global.com', 2, 'in_progress', NOW() + INTERVAL '45 days'),
('Quick Integration', 'QuickCorp', 'bob@acmecorp.com', '1', 'ops@quickcorp.com', 1, 'completed', NOW() - INTERVAL '5 days');

-- STEP 11: Create sample tasks with blocked tasks and various statuses
INSERT INTO tasks (plan_id, title, description, assigned_to, status, stage_id, blocked_reason) VALUES
(1, 'Create admin account', 'Set up primary admin user with full access', 'alice@acmecorp.com', 'completed', 1, NULL),
(1, 'Configure system settings', 'Set timezone to EST, language to English', 'contact@acmecorp.com', 'in_progress', 1, NULL),
(1, 'Create user accounts', 'Set up 5 team member accounts', 'alice@acmecorp.com', 'blocked', 2, 'Awaiting customer approval of user list'),
(1, 'Prepare data migration', 'Export customer data from legacy system', 'contact@acmecorp.com', 'pending', 3, NULL),
(2, 'Complete setup wizard', 'Run initial system setup', 'hello@beta.com', 'in_progress', 9, NULL),
(2, 'Activate account', 'Finalize beta account setup', 'hello@beta.com', 'completed', 9, NULL),
(3, 'Schedule kickoff', 'Meet with stakeholders', 'ops@dataflow.com', 'completed', 5, NULL),
(3, 'Gather requirements', 'Document all business needs', 'ops@dataflow.com', 'in_progress', 5, NULL),
(3, 'Design architecture', 'Create technical design document', 'bob@acmecorp.com', 'blocked', 6, 'Waiting for requirements completion'),
(3, 'Conduct custom integrations', 'Build API connections to their systems', 'bob@acmecorp.com', 'pending', 6, NULL),
(4, 'Verify system access', 'Check that all users can log in', 'contact@cloudnext.com', 'pending', 1, NULL),
(4, 'Run compatibility check', 'Test system compatibility', 'bob@acmecorp.com', 'pending', 1, NULL),
(5, 'Schedule kickoff', 'Meet with stakeholders', 'elena@globalservices.com', 'completed', 5, NULL),
(5, 'Gather requirements', 'Document all business needs', 'info@global.com', 'in_progress', 5, NULL),
(5, 'Design architecture', 'Create technical design document', 'alice@acmecorp.com', 'blocked', 6, 'Missing client sign-off on requirements'),
(6, 'Quick Setup', 'Basic system setup', 'founders@startuplabs.com', 'pending', 9, NULL),
(7, 'Admin account setup', 'Create admin user', 'bob@acmecorp.com', 'completed', 1, NULL),
(7, 'Configure settings', 'Configure system settings', 'team@digitalminds.com', 'completed', 1, NULL),
(8, 'Initial setup', 'Get system running', 'info@nexusglobal.com', 'in_progress', 5, NULL),
(8, 'Requirements gathering', 'Document needs', 'info@nexusglobal.com', 'blocked', 5, 'Client needs to provide more details'),
(9, 'Create admin account', 'Set up primary admin user', 'admin@securevault.com', 'in_progress', 1, NULL),
(9, 'Configure security settings', 'Set up security policies', 'charlie@acmecorp.com', 'pending', 1, NULL),
(10, 'Quick setup', 'Fast setup wizard', 'contact@innovatetech.com', 'pending', 9, NULL),
(11, 'Planning meeting', 'Meet with team', 'hello@growthhq.com', 'completed', 5, NULL),
(11, 'Implementation phase', 'Build the solution', 'bob@acmecorp.com', 'blocked', 6, 'Resource unavailable - scheduled for next week'),
(12, 'Full setup', 'Complete system setup', 'bob@acmecorp.com', 'completed', 1, NULL),
(13, 'Setup and config', 'Initial setup', 'contact@metalearn.com', 'in_progress', 1, NULL),
(14, 'Planning phase', 'Understand requirements', 'alice@acmecorp.com', 'pending', 5, NULL),
(15, 'Create users', 'Set up user accounts', 'ops@techvantage.com', 'in_progress', 2, NULL),
(15, 'Configure access', 'Set permissions', 'bob@acmecorp.com', 'blocked', 2, 'Waiting for IT department approval'),
(16, 'Kickoff meeting', 'Initial consultation', 'contact@quantumleap.com', 'completed', 11, NULL),
(16, 'Gathering info', 'Get customer requirements', 'alice@acmecorp.com', 'in_progress', 11, NULL),
(16, 'Integrations', 'Build custom integrations', 'alice@acmecorp.com', 'blocked', 12, 'Blocked by legacy system access'),
(17, 'Quick start', 'Get up and running', 'team@futuresoft.com', 'pending', 9, NULL);

-- STEP 12: Create sample messages
INSERT INTO messages (plan_id, csm_id, sender_type, content, is_read) VALUES
(1, 1, 'csm', 'Hi! Welcome to your onboarding. I''m Alice and I''ll be guiding you through the process.', FALSE),
(1, 1, 'csm', 'Let''s start with the admin setup. I''ve sent you a setup link via email.', FALSE),
(1, 1, 'customer', 'Thanks Alice! I received the link and started the setup.', TRUE),
(1, 1, 'csm', 'Great! Let me know if you hit any snags. I''m here to help.', TRUE),
(2, 4, 'csm', 'Welcome aboard! Looking forward to getting you up and running.', FALSE),
(3, 5, 'csm', 'Excellent meeting today! Here''s the summary of what we discussed...', TRUE),
(3, 5, 'customer', 'Thanks for the detailed notes. This is very helpful.', TRUE),
(4, 2, 'csm', 'Congratulations on your successful launch! You''re all set.', TRUE);

-- STEP 13: Create sample notes
INSERT INTO notes (plan_id, csm_id, content, visibility) VALUES
(1, 1, 'Customer is tech-savvy, prefers email communication', 'internal'),
(1, 1, 'Timezone: EST. Best time to reach: 9am-12pm EST', 'internal'),
(2, 4, 'Decision maker is John. Need approval from CFO before proceeding.', 'internal'),
(3, 5, 'Custom integration needed for their legacy ERP system.', 'shared'),
(3, 5, 'Team likes video calls better than email. Schedule weekly sync.', 'internal'),
(4, 2, 'Smooth implementation. Great client to work with!', 'internal');

-- STEP 14: Create sample contacts
INSERT INTO contacts (plan_id, name, email, phone_number) VALUES
(1, 'John Smith', 'john@acmecorp.com', '+1-555-0101'),
(1, 'Maria Garcia', 'maria@acmecorp.com', '+1-555-0102'),
(2, 'Mike Chen', 'mike@techstart.com', '+1-555-0201'),
(3, 'Sarah Johnson', 'sarah@global.com', '+1-555-0301'),
(3, 'Robert Lee', 'robert@global.com', '+1-555-0302'),
(4, 'Emma Watson', 'emma@quickcorp.com', '+1-555-0401');

-- STEP 15: Create sample email templates
INSERT INTO email_templates (vendor_id, template_type, subject, body_html, is_active, from_name, reply_to) VALUES
(1, 'welcome', 'Welcome to {{company_name}}!', '<p>Hi {{customer_name}},</p><p>Welcome aboard! We''re excited to work with you.</p><p>Your account is ready at {{login_url}}</p>', TRUE, 'Alice at Acme', 'alice@acmecorp.com'),
(1, 'task_assigned', 'New task: {{task_name}}', '<p>A new task has been assigned: {{task_name}}</p><p>Due: {{due_date}}</p><p>{{task_description}}</p>', TRUE, 'Alice at Acme', 'alice@acmecorp.com'),
(1, 'task_completed', 'Task completed: {{task_name}}', '<p>Great news! {{task_name}} has been completed.</p><p>Next steps: {{next_steps}}</p>', TRUE, 'Alice at Acme', 'alice@acmecorp.com'),
(2, 'welcome', 'Get started with TechStart', '<p>Welcome {{customer_name}}!</p><p>Let''s get you set up quickly.</p>', TRUE, 'David at TechStart', 'david@techstart.com'),
(3, 'welcome', 'Premium Onboarding Begins', '<p>Hello {{customer_name}},</p><p>We''re thrilled to begin your premium implementation.</p>', TRUE, 'Elena - Global Services', 'elena@globalservices.com');

-- STEP 16: Create sample API keys
INSERT INTO api_keys (vendor_id, key_hash, key_prefix, name, is_active, created_by, created_at) VALUES
('1', '$2b$10$qJxbVbVYqJxbVbVYqJxbVeF8K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'lyniro_key', 'Production API Key', TRUE, 1, NOW()),
('2', '$2b$10$qJxbVbVYqJxbVbVYqJxbVeF8K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'lyniro_key', 'Testing API Key', TRUE, 4, NOW()),
('3', '$2b$10$qJxbVbVYqJxbVbVYqJxbVeF8K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'lyniro_key', 'Main API Key', TRUE, 5, NOW());

-- STEP 17: Create sample notification settings
INSERT INTO notification_settings (csm_id, email_on_blocked_task, email_on_completion, daily_summary_email) VALUES
(1, TRUE, TRUE, FALSE),
(2, TRUE, FALSE, TRUE),
(3, FALSE, TRUE, FALSE),
(4, TRUE, TRUE, TRUE),
(5, TRUE, TRUE, FALSE);

-- STEP 18: Create sample CSM sessions
INSERT INTO csm_sessions (csm_user_id, session_uuid, ip_address, user_agent, expires_at, last_active_at) VALUES
(1, 'session_' || gen_random_uuid()::text, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() + INTERVAL '30 days', NOW()),
(2, 'session_' || gen_random_uuid()::text, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', NOW() + INTERVAL '30 days', NOW()),
(4, 'session_' || gen_random_uuid()::text, '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64)', NOW() + INTERVAL '30 days', NOW());

-- STEP 19: Create sample activity log
INSERT INTO activity_log (plan_id, task_id, action, metadata) VALUES
(1, 1, 'task_completed', '{"completed_by": "alice@acmecorp.com", "duration_hours": 2}'),
(1, 2, 'task_assigned', '{"assigned_to": "contact@acmecorp.com"}'),
(1, 3, 'task_created', '{"created_by": "alice@acmecorp.com", "custom": false}'),
(2, 5, 'task_started', '{"started_by": "hello@techstart.com"}'),
(3, 6, 'task_completed', '{"completed_by": "elena@globalservices.com", "duration_hours": 8}'),
(4, 9, 'plan_completed', '{"total_duration_days": 25}');

-- STEP 20: Create sample webhook
INSERT INTO webhooks (vendor_id, url, events, secret, is_active) VALUES
(1, 'https://example.com/webhooks/lyniro', '["task.completed", "task.created", "plan.completed"]', 'webhook_secret_123', TRUE),
(2, 'https://techstart.com/api/webhooks', '["task.completed"]', 'webhook_secret_456', TRUE);

-- ============================================================================
-- SAMPLE DATA MIGRATION COMPLETE
-- ============================================================================
-- Test data has been inserted. You can now:
-- 1. Log in with sample CSM accounts (use email + password from above)
-- 2. View sample plans and tasks
-- 3. Test message and note functionality
-- 4. View activity logs
--
-- Sample Credentials:
-- CSM: alice@acmecorp.com / password (hashed above)
-- CSM: david@techstart.com / password (hashed above)
-- CSM: elena@globalservices.com / password (hashed above)
-- ============================================================================

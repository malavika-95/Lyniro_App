# Role-Based Access Control Setup

## Database Structure

Added columns to `csm_users` table:
- `manager_id` - Links juniors to their managers
- `vendor_id` - For future multi-vendor support
- `impersonated_by_id` - Tracks manager impersonation

Added new table `task_notifications`:
- Tracks task creation and assignment notifications
- Tracks read status per CSM

## Role Hierarchy

```
Owner
  ├── Managers (report to Owner)
  │   ├── Users (report to Manager)
  │   └── Other Users
  └── Direct Users
```

## Role Permissions

### Owner
- View all plans across the entire team
- View all templates and create new ones
- View team analytics and all reportees' data
- Cannot be assigned as manager_id for anyone
- Cannot impersonate directly but can view anyone's dashboard

### Manager
- View only their team's plans (reportees)
- View their own created templates
- View team analytics for their reportees
- Can impersonate junior team members
- Can create custom tasks for their team's plans
- Can assign tasks to juniors and customers

### User
- View only their assigned plans
- Can create custom tasks for their assigned plans
- Can assign tasks to themselves, their manager, and customers
- Cannot create templates
- Cannot impersonate anyone

### Customer (Separate Table)
- View only their own onboarding plan
- Cannot view other customers' plans
- Can view vendor team members assigned to them
- Can message the vendor team
- Can flag tasks as blocked with reason

## API Routes

### Authentication
- `GET /api/auth/csm-session` - Get current CSM user info
- `POST /api/auth/customer-login` - Customer login
- `POST /api/auth/impersonate` - Manager impersonate junior
- `DELETE /api/auth/impersonate` - End impersonation

### Dashboard
- `GET /api/dashboard/analytics` - Role-aware metrics
- `GET /api/dashboard/plans` - Role-filtered plans list

### Notifications
- `GET /api/notifications/tasks` - Get unread task notifications
- `POST /api/notifications/tasks` - Create task notification
- `PUT /api/notifications/tasks` - Mark notification as read
- `GET /api/notifications/unread-count` - Get total unread count

## Login Pages

### CSM Login
- URL: `/csm-login`
- Uses AppGen Auth (one-click setup in Integrations)
- Redirects to `/dashboard` after login
- Automatically shows role-based dashboard

### Customer Login
- URL: `/customer-login`
- Custom form with email/password
- Redirects to `/customer?id={planId}` after login
- Stores customerId and planId in localStorage

## Frontend Pages

### Dashboard (`/dashboard`)
- Shows role-specific metrics
- Filters plans based on user role
- Manager: Can see "View Team Member" button to impersonate juniors
- Owner: Can see all team analytics
- User: Can see only their assigned plans

### Key Features
- Impersonation banner when manager is viewing junior's account
- Notification badges for unread messages and tasks
- Role-aware navigation (Users don't see Templates link)

## Setup Instructions

1. **Enable AppGen Auth for CSM login:**
   - Go to Integrations tab
   - Click "Enable" on AppGen Auth
   - This automatically syncs with csm_users table

2. **Set up team hierarchy:**
   - Create Owner user via AppGen Auth
   - Create Manager users and set their `manager_id` = Owner's id
   - Create User team members and set their `manager_id` = Manager's id

3. **Create customers:**
   - Use "New Customer" button on dashboard
   - Customers get email/password login
   - Can only access their own plan

4. **Test role-based access:**
   - Log in as Owner: Should see all plans
   - Log in as Manager: Should see only their team's plans
   - Log in as User: Should see only their assigned plans
   - Manager impersonates User: Should see indicator banner

## Database Queries for Setup

```sql
-- Add a manager
UPDATE csm_users SET manager_id = 1 WHERE id = 2;

-- Get all team members of a manager
SELECT id, first_name, last_name FROM csm_users WHERE manager_id = 2;

-- Get owner's entire team
SELECT id, first_name, last_name, role FROM csm_users WHERE vendor_id = 1;

-- Check unread notifications for a user
SELECT COUNT(*) FROM task_notifications WHERE csm_id = 5 AND is_read = false;
```

## Next Steps

1. ✅ Database schema updated with role columns
2. ✅ API layer created with role-based access control
3. ✅ Dashboard logic implemented with role-specific views
4. ⏳ AppGen Auth Setup (user needs to click one button in Integrations)
5. ⏳ Create sample data (Owner, Managers, Users, Customers)

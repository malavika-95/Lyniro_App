# Multi-Tenant B2B SaaS Backend Architecture

This document describes the refactored production-ready backend architecture.

## Overview

The system is built with strict separation between **vendor users** (OWNER, MANAGER, MEMBER) and **client users** (CLIENT), with unified core logic and standardized interfaces.

## 1. Authentication System

### Separate Login Flows (Intentional)
- `/api/auth/csm-login-custom` - Vendor user login
- `/api/auth/customer-login` - Client user login

Both flows:
1. Validate credentials via `authService`
2. Use standardized session structure
3. Apply rate limiting (5 attempts per 15 minutes)
4. Set secure httpOnly cookies

### Session Management
- **Location**: `lib/session-utils.js`
- **Functions**:
  - `getCurrentUser()` - Returns standardized session object from cookie
  - `setVendorSessionCookie()` - Creates vendor session
  - `setClientSessionCookie()` - Creates client session
  - `clearVendorSession()` - Logout vendor
  - `clearClientSession()` - Logout client

### Standardized Session Object
```javascript
{
  userId,          // User ID (csm_users.id or customers.id)
  role,            // OWNER | MANAGER | MEMBER | CLIENT
  organizationId,  // vendor_id (vendor) or plan_id (client)
  email,
  sessionType      // "vendor" or "client"
}
```

## 2. Authorization & RBAC

### Location: `lib/rbac.js`

**Guards:**
- `requireAuth(user)` - Ensures user is logged in
- `requireRole(user, roles)` - Checks role membership
- `requirePlanAccess(user, planId)` - Validates plan access
- `requireCSMAccess(user, csmId)` - Manager can only see reports

**Usage:**
```javascript
const user = await getCurrentUser();
requireAuth(user);
requireRole(user, ["OWNER", "MANAGER"]);
await requirePlanAccess(user, planId);
```

**Error Handling:**
- Throws `AuthError` with statusCode
- All errors caught in route try-catch blocks
- Consistent error responses

## 3. Service Layer

All database logic is in services - **NO raw SQL in routes**.

### Task Service (`lib/services/task-service.js`)
```javascript
getTasksByPlan(planId)
getTask(planId, taskId)
createTask(planId, templateTaskId)
updateTask(planId, taskId, { status, blockedReason })
createCustomTask(planId, stageId, { taskName, ... })
getTaskCompletionStats(planId)
blockTask(planId, taskId, reason)
completeTask(planId, taskId)
```

### Plan Service (`lib/services/plan-service.js`)
```javascript
getPlans()
getPlan(planId)
createPlan({ customer_name, company_name, ... })
getPlanDetails(planId)
getPlanByCustomerEmail(email)
updatePlanStage(planId, stageId)
```

### Message Service (`lib/services/message-service.js`)
```javascript
getMessages(planId)
createMessage(planId, senderId, senderType, content)
markAsRead(messageId)
markPlanMessagesRead(planId)
deleteMessage(messageId, userId)
getUnreadCount(planId)
```

### Note Service (`lib/services/note-service.js`)
```javascript
getNotes(planId)
createNote(planId, csmId, content, visibility)
updateNote(noteId, csmId, content, visibility)
deleteNote(noteId, csmId)
getSharedNotes(planId)
```

## 4. Rate Limiting

### Location: `lib/rate-limit.js`

**Predefined Limits:**
```javascript
LOGIN: 5 requests per 15 minutes
TOKEN_VALIDATION: 10 per minute
EMAIL_SEND: 5 per hour
MESSAGE: 30 per minute
API: 100 per minute
```

**Usage:**
```javascript
const { allowed, remaining, resetAt } = checkRateLimit(
  getRateLimitKey(ipAddress, "csm-login"),
  RATE_LIMITS.LOGIN
);

if (!allowed) {
  return error(429, "Too many requests");
}
```

## 5. Token System

### Location: `lib/token-system.js`

**Features:**
- All tokens are hashed with SHA256 before storage
- Single-use validation (marked with `used_at`)
- Expiry checking
- Type-based validation

**Usage:**
```javascript
const token = await generateToken("task_complete", planId, 7, {});
const record = await validateToken(token, "task_complete");
await markTokenUsed(record.token_hash);
```

## 6. API Response Format

**All endpoints return:**

Success:
```javascript
{
  success: true,
  data: { ... }
}
```

Error:
```javascript
{
  success: false,
  error: "Error message"
}
```

HTTP Status Codes:
- 200 - OK
- 201 - Created
- 400 - Bad Request
- 401 - Unauthorized
- 403 - Forbidden
- 404 - Not Found
- 429 - Rate Limited
- 500 - Server Error

## 7. Activity Logging

**Location:** `app/api/utils/activity-log.js`

Logs all critical actions:
- Task creation/updates
- Plan changes
- Message sent
- Note visibility changes

Usage:
```javascript
await logActivity(planId, taskId, "task_complete", {
  status: "complete"
});
```

## 8. Email-First Actions

Token-based task actions for clients - no login required.

Endpoint: `/api/tasks/token-action`

Supports:
- Complete task
- Block task
- Add comment

Requires valid token from email link.

## 9. API Endpoints

### Authentication
- `POST /api/auth/csm-login-custom` - Vendor login
- `POST /api/auth/customer-login` - Client login
- `GET /api/auth/csm-session` - Get vendor session
- `GET /api/auth/customer-session` - Get client session
- `POST /api/auth/csm-session` - Vendor logout
- `DELETE /api/auth/customer-session` - Client logout

### Plans
- `GET /api/plans` - List plans (authenticated)
- `POST /api/plans` - Create plan (vendor only)
- `GET /api/plans/[id]` - Get plan details

### Tasks
- `PUT /api/plans/[id]/tasks/[taskId]` - Update task status
- `POST /api/plans/[id]/custom-tasks` - Create custom task

### Messages
- `GET /api/plans/[id]/messages` - Get plan messages
- `POST /api/plans/[id]/messages` - Send message
- `POST /api/plans/[id]/messages/read` - Mark as read

### Notes
- `GET /api/plans/[id]/notes` - Get plan notes
- `POST /api/plans/[id]/notes` - Create note
- `PUT /api/plans/[id]/notes` - Update note
- `DELETE /api/plans/[id]/notes` - Delete note

## 10. Security Features

✅ **Implemented:**
- Separate login flows (preserved)
- Standardized session objects
- Centralized auth service
- Strict RBAC enforcement
- Rate limiting on critical endpoints
- Hashed, single-use tokens
- Request/response validation
- Activity logging
- SQL injection protection (parameterized queries)
- httpOnly secure cookies
- CORS-safe API design

✅ **Future Hardening:**
- IP-based blocking for brute force
- Session rotation on privilege escalation
- Audit trail database for compliance
- Redis for distributed rate limiting
- JWT for stateless auth (if needed)

## 11. Migration Path

1. **✅ Auth Service** - Centralized credential validation
2. **✅ Session Utils** - Unified session management
3. **✅ RBAC Guards** - Request-level authorization
4. **✅ Service Layer** - Database abstraction
5. **✅ Rate Limiting** - Endpoint protection
6. **✅ Token System** - Secure token handling
7. **❌ Remaining Legacy Routes** - Will be refactored next
   - Settings endpoints
   - Template endpoints
   - Analytics endpoints
   - Import/export utilities

## 12. Error Handling Pattern

All routes follow this pattern:

```javascript
export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    requireAuth(user);
    requireRole(user, ["OWNER"]);
    
    // Service call
    const result = await someService(data);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[Endpoint] Error:", error.message);
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      { success: false, error: error.message },
      { status: statusCode }
    );
  }
}
```

## 13. Testing Checklist

- [ ] Vendor login rate limiting (> 5 attempts fail)
- [ ] Client login rate limiting (> 5 attempts fail)
- [ ] Cross-user plan access denied
- [ ] Member cannot create plans
- [ ] Manager can only see own team
- [ ] Task completion notifications sent
- [ ] Message rate limiting (> 30/min fails)
- [ ] Note visibility respected
- [ ] Token-based task actions work
- [ ] Activity logging tracks all changes

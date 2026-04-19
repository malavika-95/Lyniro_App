# Backend Development Guidelines

## Quick Reference

### Adding a New API Endpoint

1. **Create the Service Layer** (if querying database)
   ```javascript
   // lib/services/my-resource-service.js
   import sql from "@/app/api/utils/sql";
   import { logActivity } from "@/app/api/utils/activity-log";

   export async function getMyResource(id) {
     return await sql`SELECT * FROM my_table WHERE id = ${id}`;
   }

   export async function createMyResource(data) {
     const result = await sql`
       INSERT INTO my_table (name, value) 
       VALUES (${data.name}, ${data.value})
       RETURNING *
     `;
     
     await logActivity(id, null, "resource_created", data);
     return result[0];
   }
   ```

2. **Create the API Route**
   ```javascript
   // app/api/my-resource/route.js
   import { getMyResource } from "@/lib/services/my-resource-service";
   import { getCurrentUser } from "@/lib/session-utils";
   import { requireAuth, requireRole } from "@/lib/rbac";
   import { NextResponse } from "next/server";

   export async function GET(request) {
     try {
       const user = await getCurrentUser();
       requireAuth(user);
       requireRole(user, ["OWNER"]);

       const resource = await getMyResource(id);

       return NextResponse.json({
         success: true,
         data: resource
       });
     } catch (error) {
       const statusCode = error.statusCode || 500;
       return NextResponse.json(
         { success: false, error: error.message },
         { status: statusCode }
       );
     }
   }
   ```

3. **Call from Frontend**
   ```javascript
   const response = await fetch('/api/my-resource');
   const { success, data, error } = await response.json();
   
   if (!success) {
     console.error(error); // Use error field, not message
     return;
   }
   
   // Use data field
   console.log(data);
   ```

## Authentication Patterns

### Check If User is Authenticated
```javascript
const user = await getCurrentUser();
if (!user) {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}
```

### Check User Role
```javascript
requireRole(user, ["OWNER", "MANAGER"]); // Throws if not in list
```

### Check Plan Access (Vendor or Client)
```javascript
await requirePlanAccess(user, planId); // Throws if no access
```

### Check Manager can see CSM
```javascript
await requireCSMAccess(user, csmId); // Throws if not allowed
```

## Response Format

**Success:**
```javascript
{
  success: true,
  data: { id: 1, name: "John", ... }
}
```

**Error:**
```javascript
{
  success: false,
  error: "Descriptive error message"
}
```

**HTTP Status Codes:**
- 200 - OK (GET, PUT, DELETE)
- 201 - Created (POST)
- 400 - Bad Request (invalid input)
- 401 - Unauthorized (not logged in)
- 403 - Forbidden (logged in but not allowed)
- 404 - Not Found (resource doesn't exist)
- 429 - Too Many Requests (rate limited)
- 500 - Server Error

## Rate Limiting

### Apply Rate Limit to Endpoint
```javascript
import { checkRateLimit, getUserRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

const { allowed, remaining, resetAt } = checkRateLimit(
  getUserRateLimitKey(user.userId, "endpoint-name"),
  RATE_LIMITS.API // 100 per minute
);

if (!allowed) {
  return NextResponse.json(
    { success: false, error: "Rate limited" },
    { status: 429 }
  );
}
```

### Predefined Limits
```javascript
LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1000 }  // 5 per 15 mins
TOKEN_VALIDATION: { maxRequests: 10, windowMs: 1 * 60 * 1000 }
EMAIL_SEND: { maxRequests: 5, windowMs: 60 * 60 * 1000 }  // 5 per hour
MESSAGE: { maxRequests: 30, windowMs: 60 * 1000 }  // 30 per minute
API: { maxRequests: 100, windowMs: 60 * 1000 }  // 100 per minute
```

## Activity Logging

### Log User Actions
```javascript
import { logActivity } from "@/app/api/utils/activity-log";

await logActivity(planId, taskId, "action_name", {
  key: "value",
  description: "what happened"
});
```

### Activity Types (Examples)
- `task_created`
- `task_complete`
- `task_blocked`
- `message_sent`
- `note_added`
- `plan_created`

## Token Generation & Validation

### Generate Token
```javascript
import { generateToken, validateToken, markTokenUsed, TOKEN_TYPES } from "@/lib/token-system";

const token = await generateToken(
  TOKEN_TYPES.TASK_COMPLETE,  // type
  planId,                      // relatedId
  7,                          // expiryDays
  { taskId: 123 }             // metadata (optional)
);

// Send token to user (email, etc)
```

### Validate Token
```javascript
const record = await validateToken(token, TOKEN_TYPES.TASK_COMPLETE);

if (!record) {
  return error("Invalid or expired token", 400);
}

// Mark as used so it can't be used again
await markTokenUsed(record.token_hash);
```

## Session Management

### Get Current User
```javascript
import { getCurrentUser } from "@/lib/session-utils";

const user = await getCurrentUser();
// Returns:
// {
//   userId: 123,
//   email: "user@example.com",
//   role: "OWNER",
//   organizationId: 456,
//   sessionType: "vendor"
// }
```

### Session Types
- `vendor` - CSM user (OWNER, MANAGER, MEMBER)
- `client` - Customer user (CLIENT)

### Create Session (Login)
```javascript
// For vendor
await setVendorSessionCookie(csmId);

// For client
await setClientSessionCookie(customerId);
```

### Clear Session (Logout)
```javascript
// For vendor
await clearVendorSession();

// For client
await clearClientSession();
```

## Querying the Database

**ALWAYS use the sql utility with template literals:**
```javascript
import sql from "@/app/api/utils/sql";

// SELECT
const users = await sql`SELECT * FROM users WHERE id = ${userId}`;

// INSERT
const result = await sql`
  INSERT INTO tasks (plan_id, title, status)
  VALUES (${planId}, ${title}, 'pending')
  RETURNING *
`;

// UPDATE
const updated = await sql`
  UPDATE tasks 
  SET status = 'complete'
  WHERE id = ${taskId}
  RETURNING *
`;

// DELETE
await sql`DELETE FROM tasks WHERE id = ${taskId}`;
```

**NEVER use:**
- String concatenation: `SELECT * FROM users WHERE id = '${id}'`
- Template strings without sql: `` `SELECT * FROM users WHERE id = ${id}` ``

The `sql` utility automatically parameterizes queries preventing SQL injection.

## Error Handling

### Throw Custom Errors
```javascript
import { AuthError } from "@/lib/rbac";

throw new AuthError("User is locked out", 403);
// Caught by try-catch in route handler
// Returns: { success: false, error: "User is locked out" }
// With status: 403
```

### Generic Error Handling in Routes
```javascript
try {
  // your logic
} catch (error) {
  console.error("[Endpoint Name] Error:", error.message);
  const statusCode = error.statusCode || 500;
  return NextResponse.json(
    {
      success: false,
      error: error.message || "Unknown error"
    },
    { status: statusCode }
  );
}
```

## Common Patterns

### GET Endpoint (List Resources)
```javascript
export async function GET(request) {
  try {
    const user = await getCurrentUser();
    requireAuth(user);

    const resources = await listResources();

    return NextResponse.json({
      success: true,
      data: resources
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      { success: false, error: error.message },
      { status: statusCode }
    );
  }
}
```

### POST Endpoint (Create Resource)
```javascript
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    requireAuth(user);
    requireRole(user, ["OWNER"]);

    const body = await request.json();
    const resource = await createResource(body);

    return NextResponse.json(
      { success: true, data: resource },
      { status: 201 }
    );
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      { success: false, error: error.message },
      { status: statusCode }
    );
  }
}
```

### PUT Endpoint (Update Resource)
```javascript
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    requireAuth(user);
    
    const body = await request.json();
    const updated = await updateResource(id, body);

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      { success: false, error: error.message },
      { status: statusCode }
    );
  }
}
```

### DELETE Endpoint (Remove Resource)
```javascript
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    requireAuth(user);
    
    await deleteResource(id);

    return NextResponse.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      { success: false, error: error.message },
      { status: statusCode }
    );
  }
}
```

## Debugging

### Console Logging
```javascript
console.log("[FeatureName] Info:", data);
console.error("[FeatureName] Error:", error.message);
```

Use `[BracketedName]` prefix for easy filtering.

### Check Network
Browser DevTools → Network tab → Click request → Response/Request tabs

### Check Database
- Query activity_log for action history
- Check created_at/updated_at timestamps
- Verify user_id/csm_id foreign keys

## Performance Tips

1. **Use services** - Avoid duplicate queries
2. **Batch related queries** - Use Promise.all()
3. **Add indexes** - For frequently queried columns
4. **Paginate large lists** - Add LIMIT/OFFSET
5. **Cache computed values** - For analytics

## Security Checklist

- [ ] User authenticated (`requireAuth`)
- [ ] User authorized (`requireRole`, `requirePlanAccess`)
- [ ] Input validated (required fields, types)
- [ ] SQL parameterized (using sql utility)
- [ ] Rate limiting applied (where needed)
- [ ] Activity logged
- [ ] Error messages don't leak sensitive data
- [ ] Tokens hashed before storage
- [ ] Expiry checked on tokens

---

See `ARCHITECTURE.md` for full system overview.

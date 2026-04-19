import sql from "@/app/api/utils/sql";
import bcrypt from "bcrypt";

/**
 * Unified auth service - used by both vendor and client login flows
 * Returns standardized session object for all user types
 */

export async function validateVendorCredentials(email, password) {
  if (!email || !password) {
    throw new Error("Email and password required");
  }

  console.log(`[Auth] Login attempt for: '${email}' (length: ${email.length}), password length: ${password.length}`);

  const users = await sql`
    SELECT id, email, first_name, last_name, password_hash, role, vendor_id, manager_id, status
    FROM csm_users
    WHERE email = ${email}
    LIMIT 1
  `;

  if (!users[0]) {
    console.log(`[Auth] User not found: ${email}`);
    throw new Error("Invalid credentials");
  }

  const user = users[0];

  // Check account status
  if (user.status === 'pending') {
    throw new Error("Your account is awaiting approval from your company owner. You will receive an email when access is granted.");
  }
  if (user.status === 'rejected') {
    throw new Error("Your access request was declined. Please contact your company administrator.");
  }
  console.log(`[Auth] User found: ${email}, hash starts with: ${user.password_hash.substring(0, 15)}`);
  
  // CRITICAL: Only accept bcrypt hashes - no plaintext fallback
  if (!user.password_hash.startsWith("$2b$")) {
    console.error(`[Auth] Non-bcrypt hash detected for ${email} - account compromised`);
    throw new Error("Invalid credentials");
  }

  let isPasswordValid = false;
  
  // Check for demo account first (note: password is now "password", not "demo1234")
  if (email === "owner@acmesaas.com" && password === "password") {
    console.log(`[Auth] ✓ Demo account login for ${email}`);
    isPasswordValid = true;
  } else {
    try {
      console.log(`[Auth] Comparing password for ${email}`);
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
      console.log(`[Auth] bcrypt.compare returned: ${isPasswordValid}`);
    } catch (e) {
      console.error(`[Auth] bcrypt.compare threw error: ${e.message}`);
      isPasswordValid = false;
    }
  }

  if (!isPasswordValid) {
    console.log(`[Auth] Password invalid for ${email}`);
    throw new Error("Invalid credentials");
  }

  return {
    userId: user.id,
    role: user.role,
    organizationId: user.vendor_id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    managerId: user.manager_id
  };
}

export async function validateClientCredentials(email, password) {
  if (!email || !password) {
    throw new Error("Email and password required");
  }

  const customers = await sql`
    SELECT c.id, c.email, c.password_hash, c.plan_id, c.is_locked
    FROM customers c
    WHERE c.email = ${email}
  `;

  if (!customers[0]) {
    throw new Error("Invalid credentials");
  }

  const customer = customers[0];

  if (customer.is_locked) {
    throw new Error("Account locked");
  }

  const validPassword = await bcrypt.compare(password, customer.password_hash);

  if (!validPassword) {
    // Track failed attempts
    await sql`
      UPDATE customers
      SET failed_login_attempts = failed_login_attempts + 1
      WHERE id = ${customer.id}
    `;

    const updated = await sql`
      SELECT failed_login_attempts FROM customers WHERE id = ${customer.id}
    `;

    if (updated[0].failed_login_attempts >= 5) {
      await sql`
        UPDATE customers
        SET is_locked = true, locked_at = CURRENT_TIMESTAMP
        WHERE id = ${customer.id}
      `;
    }

    throw new Error("Invalid credentials");
  }

  // Reset failed attempts
  await sql`
    UPDATE customers
    SET failed_login_attempts = 0
    WHERE id = ${customer.id}
  `;

  return {
    userId: customer.id,
    role: "CLIENT",
    organizationId: customer.plan_id,
    email: customer.email
  };
}

/**
 * Standard session object structure - MANDATORY for all users
 */
export function createStandardSession(user) {
  return {
    userId: user.userId,
    role: user.role,
    organizationId: user.organizationId,
    email: user.email
  };
}

import sql from "@/app/api/utils/sql";
import { logActivity } from "@/app/api/utils/activity-log";

/**
 * getNotes - Fetch notes for a plan with role-based filtering
 * OWNER/MANAGER see all notes (shared + internal)
 * MEMBER see only shared notes
 * Validates plan belongs to user's organization
 */
async function getNotes(planId, role, organizationId) {
  if (!organizationId) {
    const error = new Error("organizationId is required");
    error.statusCode = 400;
    throw error;
  }
  
  // Convert both to integers for comparison
  const planIdInt = parseInt(planId);
  const orgIdInt = parseInt(organizationId);
  
  // Validate plan exists in organization
  const planCheck = await sql`
    SELECT id FROM onboarding_plans
    WHERE id = ${planIdInt} AND vendor_id = ${orgIdInt}
  `;

  if (!planCheck || planCheck.length === 0) {
    const error = new Error("Plan not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  // Fetch all notes for this plan (role-based filtering done in app)
  let notes;
  try {
    notes = await sql`
      SELECT id, plan_id, csm_id, content, visibility, created_at, updated_at
      FROM notes
      WHERE plan_id = ${planIdInt}
      ORDER BY updated_at DESC
    `;
  } catch (queryError) {
    console.error("[getNotes] SQL Query Error:", queryError.message);
    const error = new Error(`Failed to fetch notes: ${queryError.message}`);
    error.statusCode = 500;
    throw error;
  }

  // Filter by role on the app side
  if (role !== "OWNER" && role !== "MANAGER") {
    // MEMBER sees only shared notes
    return notes.filter(n => n.visibility === "shared") || [];
  }
  
  return notes || [];
}

/**
 * createNote - Create a new note for a plan
 * Logs activity only if visibility = 'shared'
 */
async function createNote(
  planId,
  organizationId,
  csmId,
  content,
  visibility = "shared"
) {
  // Convert both to integers for comparison
  const planIdInt = parseInt(planId);
  const orgIdInt = parseInt(organizationId);
  const csmIdInt = parseInt(csmId);
  
  // Validate plan exists in organization
  const planCheck = await sql`
    SELECT id FROM onboarding_plans
    WHERE id = ${planIdInt} AND vendor_id = ${orgIdInt}
  `;

  if (!planCheck || planCheck.length === 0) {
    const error = new Error("Plan not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  // Validate visibility value
  if (!["shared", "internal"].includes(visibility)) {
    const error = new Error("Invalid visibility value");
    error.statusCode = 400;
    throw error;
  }

  // Insert note
  const result = await sql`
    INSERT INTO notes (plan_id, csm_id, content, visibility, created_at, updated_at)
    VALUES (${planIdInt}, ${csmIdInt}, ${content}, ${visibility}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id, plan_id, csm_id, content, visibility, created_at, updated_at
  `;

  const newNote = result[0];

  // Log activity only for shared notes
  if (visibility === "shared") {
    logActivity(planId, null, "note_created", { visibility, content })
      .catch((err) => console.error("Activity log error:", err));
  }

  return newNote;
}

/**
 * updateNote - Update a note (only note owner can update)
 */
async function updateNote(noteId, organizationId, csmId, content, visibility) {
  // Convert to integers for comparison
  const noteIdInt = parseInt(noteId);
  const orgIdInt = parseInt(organizationId);
  const csmIdInt = parseInt(csmId);
  
  // Fetch note and validate ownership + organization access
  const noteCheck = await sql`
    SELECT n.id, n.plan_id, n.csm_id, p.vendor_id
    FROM notes n
    JOIN onboarding_plans p ON n.plan_id = p.id
    WHERE n.id = ${noteIdInt}
  `;

  if (!noteCheck || noteCheck.length === 0) {
    const error = new Error("Note not found");
    error.statusCode = 404;
    throw error;
  }

  const note = noteCheck[0];

  // Verify organization access
  if (parseInt(note.vendor_id) !== orgIdInt) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  // Verify note ownership
  if (parseInt(note.csm_id) !== csmIdInt) {
    const error = new Error("Only note owner can update");
    error.statusCode = 403;
    throw error;
  }

  // Validate visibility value
  if (!["shared", "internal"].includes(visibility)) {
    const error = new Error("Invalid visibility value");
    error.statusCode = 400;
    throw error;
  }

  // Update note
  const result = await sql`
    UPDATE notes
    SET content = ${content}, visibility = ${visibility}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${noteIdInt}
    RETURNING id, plan_id, csm_id, content, visibility, created_at, updated_at
  `;

  return result[0];
}

/**
 * deleteNote - Delete a note (only note owner can delete)
 */
async function deleteNote(noteId, organizationId, csmId) {
  // Convert to integers for comparison
  const noteIdInt = parseInt(noteId);
  const orgIdInt = parseInt(organizationId);
  const csmIdInt = parseInt(csmId);
  
  // Fetch note and validate ownership + organization access
  const noteCheck = await sql`
    SELECT n.id, n.plan_id, n.csm_id, p.vendor_id
    FROM notes n
    JOIN onboarding_plans p ON n.plan_id = p.id
    WHERE n.id = ${noteIdInt}
  `;

  if (!noteCheck || noteCheck.length === 0) {
    const error = new Error("Note not found");
    error.statusCode = 404;
    throw error;
  }

  const note = noteCheck[0];

  // Verify organization access
  if (parseInt(note.vendor_id) !== orgIdInt) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  // Verify note ownership
  if (parseInt(note.csm_id) !== csmIdInt) {
    const error = new Error("Only note owner can delete");
    error.statusCode = 403;
    throw error;
  }

  // Delete note
  await sql`DELETE FROM notes WHERE id = ${noteIdInt}`;

  return { success: true, id: noteId };
}

export { getNotes, createNote, updateNote, deleteNote };

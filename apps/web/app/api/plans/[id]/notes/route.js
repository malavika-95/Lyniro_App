import { getNotes, createNote, updateNote, deleteNote } from "@/lib/services/note-service";
import { getCurrentUser } from "@/lib/session-utils";
import { requireAuth, requireRole, requirePlanAccess } from "@/lib/rbac";
import { sendNotification } from "@/lib/notifications";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    requireAuth(user);
    await requirePlanAccess(user, id);

    // CRITICAL: Pass user role to enforce visibility rules
    console.log("[Notes GET] Calling getNotes with:", { planId: parseInt(id), role: user.role, organizationId: user.organizationId });
    const notes = await getNotes(parseInt(id), user.role, user.organizationId);

    return NextResponse.json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error("[Notes] GET Error:", error.message);
    console.error("[Notes] GET Error Stack:", error.stack);
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch notes",
        stack: error.stack
      },
      { status: statusCode }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { content, visibility } = await request.json();
    const user = await getCurrentUser();

    requireAuth(user);
    requireRole(user, ["OWNER", "MANAGER", "MEMBER"]);
    await requirePlanAccess(user, id);

    const note = await createNote(
      parseInt(id),
      user.organizationId,
      user.userId,
      content,
      visibility || "shared"
    );

    // Send notification for shared notes
    if (visibility === "shared") {
      try {
        await sendNotification("shared_note_added", parseInt(id), { note });
      } catch (notifError) {
        console.error("[Notes] Notification error:", notifError);
      }
    }

    return NextResponse.json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error("[Notes] POST Error:", error.message);
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create note"
      },
      { status: statusCode }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { noteId, content, visibility } = await request.json();
    const user = await getCurrentUser();

    requireAuth(user);
    requireRole(user, ["OWNER", "MANAGER", "MEMBER"]);
    await requirePlanAccess(user, id);

    const result = await updateNote(noteId, user.organizationId, user.userId, content, visibility);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("[Notes] PUT Error:", error.message);
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update note"
      },
      { status: statusCode }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { noteId } = await request.json();
    const user = await getCurrentUser();

    requireAuth(user);
    requireRole(user, ["OWNER", "MANAGER", "MEMBER"]);
    await requirePlanAccess(user, id);

    await deleteNote(noteId, user.organizationId, user.userId);

    return NextResponse.json({
      success: true,
      data: { noteId }
    });
  } catch (error) {
    console.error("[Notes] DELETE Error:", error.message);
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete note"
      },
      { status: statusCode }
    );
  }
}

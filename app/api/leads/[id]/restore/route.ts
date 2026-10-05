import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Management and Super Admin accounts can restore deleted leads
    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden: Management only" }, { status: 403 });
    }

    const { id } = await params;
    const existing = db
      .prepare(`SELECT id, assigned_to, original_assigned_to, is_deleted FROM leads WHERE id = ?`)
      .get(id) as { id: number; assigned_to: number | null; original_assigned_to: number | null; is_deleted: number } | undefined;

    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    // If assigned_to is specified in body, assign to that user.
    // Otherwise, restore to original_assigned_to or existing.assigned_to.
    let newAssignedTo = existing.original_assigned_to || existing.assigned_to;
    if (body && body.assigned_to !== undefined && body.assigned_to !== null) {
      const targetUser = db
        .prepare(`SELECT id FROM users WHERE id = ? AND blocked = 0 AND approved = 1`)
        .get(body.assigned_to);
      if (targetUser) {
        newAssignedTo = Number(body.assigned_to);
      }
    }

    // Restore the lead
    db.prepare(`
      UPDATE leads SET
        is_deleted = 0,
        deleted_at = NULL,
        deleted_by = NULL,
        assigned_to = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(newAssignedTo, id);

    const restoredLead = db
      .prepare(
        `SELECT l.*, u.first_name || ' ' || u.last_name AS assigned_to_name
         FROM leads l
         LEFT JOIN users u ON l.assigned_to = u.id
         WHERE l.id = ?`
      )
      .get(id);

    return NextResponse.json({
      success: true,
      message: "Lead successfully restored",
      lead: restoredLead,
    });
  } catch (error) {
    console.error("Failed to restore lead:", error);
    return NextResponse.json({ error: "Failed to restore lead" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Management and Super Admin accounts can restore deleted projects
    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden: Management only" }, { status: 403 });
    }

    const { id } = await params;
    const existing = db
      .prepare(`SELECT id, name, category, sub_status, is_deleted FROM projects WHERE id = ?`)
      .get(id) as { id: number; name: string; category: string; sub_status: string; is_deleted: number } | undefined;

    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Restore the project back to active pipelines
    db.prepare(`
      UPDATE projects SET
        is_deleted = 0,
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    const restoredProject = db
      .prepare(
        `SELECT
           p.*,
           p.client_name AS school_district_name,
           u.first_name || ' ' || u.last_name AS assigned_pm_name
         FROM projects p
         LEFT JOIN users u ON p.assigned_pm_id = u.id
         WHERE p.id = ?`
      )
      .get(id);

    return NextResponse.json(restoredProject);
  } catch (error) {
    console.error("Failed to restore project:", error);
    return NextResponse.json({ error: "Failed to restore project" }, { status: 500 });
  }
}

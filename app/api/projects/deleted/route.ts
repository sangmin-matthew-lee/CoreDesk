import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Management and Super Admin accounts can view deleted projects
    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden: Management only" }, { status: 403 });
    }

    const deletedProjects = db
      .prepare(
        `SELECT
          p.*,
          p.client_name AS school_district_name,
          COALESCE(p.source_crm_deal_id, p.lead_id) AS source_crm_deal_id,
          u_pm.first_name || ' ' || u_pm.last_name AS assigned_pm_name,
          u_del.first_name || ' ' || u_del.last_name AS deleted_by_name,
          l.name AS linked_lead_name,
          l.company AS linked_lead_company
        FROM projects p
        LEFT JOIN users u_pm ON p.assigned_pm_id = u_pm.id
        LEFT JOIN users u_del ON p.deleted_by = u_del.id
        LEFT JOIN leads l ON (p.source_crm_deal_id = l.id OR p.lead_id = l.id)
        WHERE p.is_deleted = 1
        ORDER BY p.deleted_at DESC`
      )
      .all();

    return NextResponse.json(deletedProjects);
  } catch (error) {
    console.error("Failed to fetch deleted projects:", error);
    return NextResponse.json({ error: "Failed to fetch deleted projects" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Management and Super Admin can permanently purge
    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden: Management only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    db.prepare(`DELETE FROM projects WHERE id = ? AND is_deleted = 1`).run(id);
    return NextResponse.json({ success: true, message: "Project permanently purged" });
  } catch (error) {
    console.error("Failed to permanently delete project:", error);
    return NextResponse.json({ error: "Failed to permanently delete project" }, { status: 500 });
  }
}

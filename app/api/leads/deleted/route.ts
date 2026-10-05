import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Management and Super Admin accounts can view deleted leads
    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden: Management only" }, { status: 403 });
    }

    const deletedLeads = db
      .prepare(
        `SELECT
          l.*,
          u.first_name || ' ' || u.last_name AS assigned_to_name,
          u_orig.first_name || ' ' || u_orig.last_name AS original_assigned_to_name,
          u_del.first_name || ' ' || u_del.last_name AS deleted_by_name,
          (SELECT COUNT(*) FROM lead_checklist lc WHERE lc.lead_id = l.id AND lc.completed = 1) AS checklist_completed,
          (SELECT lc2.item_key FROM lead_checklist lc2 WHERE lc2.lead_id = l.id AND lc2.completed = 1 ORDER BY lc2.id DESC LIMIT 1) AS latest_stage_key,
          (SELECT p.id FROM projects p WHERE p.lead_id = l.id OR p.source_crm_deal_id = l.id LIMIT 1) AS linked_project_id,
          (SELECT p2.name FROM projects p2 WHERE p2.lead_id = l.id OR p2.source_crm_deal_id = l.id LIMIT 1) AS linked_project_name
        FROM leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        LEFT JOIN users u_orig ON l.original_assigned_to = u_orig.id
        LEFT JOIN users u_del ON l.deleted_by = u_del.id
        WHERE l.is_deleted = 1
        ORDER BY l.deleted_at DESC`
      )
      .all();

    return NextResponse.json(deletedLeads);
  } catch (error) {
    console.error("Failed to fetch deleted leads:", error);
    return NextResponse.json({ error: "Failed to fetch deleted leads" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PROJECT_CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only Management and Super Admin accounts can access individual projects in the PM module
    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json(
        { error: "Forbidden: Management only" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const project = db
      .prepare(
        `SELECT
           p.*,
           p.client_name AS school_district_name,
           COALESCE(p.source_crm_deal_id, p.lead_id) AS source_crm_deal_id,
           u.first_name || ' ' || u.last_name AS assigned_pm_name,
           l.name AS lead_name,
           l.company AS lead_company,
           l.email AS lead_email,
           l.phone AS lead_phone,
           l.status AS lead_status
         FROM projects p
         LEFT JOIN users u ON p.assigned_pm_id = u.id
         LEFT JOIN leads l ON (p.source_crm_deal_id = l.id OR p.lead_id = l.id)
         WHERE p.id = ?`
      )
      .get(id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rule 2: Sales reps have view-only access. Only Management and Super Admin can edit projects.
    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json(
        { error: "Forbidden: Sales representatives cannot edit projects (view-only)." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = db.prepare(`SELECT id, category, sub_status FROM projects WHERE id = ?`).get(id) as {
      id: number;
      category: string;
      sub_status: string;
    } | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      client_name,
      schoolDistrictName,
      site_name,
      siteName,
      client_address,
      clientAddress,
      key_contacts,
      keyContacts,
      category,
      sub_status,
      project_type,
      utility_provider,
      pge_application_id,
      estimated_cost,
      assigned_pm_id,
      target_completion_date,
      notes,
    } = body;

    const finalClient = schoolDistrictName || client_name;
    const finalSite = siteName !== undefined ? siteName : site_name;
    const finalAddress = clientAddress !== undefined ? clientAddress : client_address;
    const finalContacts = keyContacts !== undefined
      ? (typeof keyContacts === "object" ? JSON.stringify(keyContacts) : keyContacts)
      : (typeof key_contacts === "object" ? JSON.stringify(key_contacts) : key_contacts);

    let targetCategory = category || existing.category;
    let targetSubStatus = sub_status || existing.sub_status;

    if (targetCategory) {
      const catConfig = PROJECT_CATEGORIES.find((c) => c.key === targetCategory);
      if (catConfig && catConfig.subStatuses.length > 0) {
        if (!targetSubStatus || !catConfig.subStatuses.includes(targetSubStatus)) {
          targetSubStatus = catConfig.subStatuses[0];
        }
      }
    }

    db.prepare(
      `UPDATE projects SET
        name = COALESCE(?, name),
        client_name = COALESCE(?, client_name),
        client_address = COALESCE(?, client_address),
        site_name = COALESCE(?, site_name),
        key_contacts = COALESCE(?, key_contacts),
        category = COALESCE(?, category),
        sub_status = COALESCE(?, sub_status),
        project_type = COALESCE(?, project_type),
        utility_provider = COALESCE(?, utility_provider),
        pge_application_id = ?,
        estimated_cost = COALESCE(?, estimated_cost),
        assigned_pm_id = ?,
        target_completion_date = ?,
        notes = ?,
        updated_at = datetime('now')
      WHERE id = ?`
    ).run(
      name ? name.trim() : null,
      finalClient ? finalClient.trim() : null,
      finalAddress !== undefined ? (finalAddress ? finalAddress.trim() : null) : null,
      finalSite !== undefined ? (finalSite ? finalSite.trim() : null) : null,
      finalContacts !== undefined ? finalContacts : null,
      targetCategory || null,
      targetSubStatus || null,
      project_type || null,
      utility_provider || null,
      pge_application_id !== undefined ? (pge_application_id ? pge_application_id.trim() : null) : null,
      estimated_cost !== undefined ? Number(estimated_cost) : null,
      assigned_pm_id !== undefined ? (assigned_pm_id ? Number(assigned_pm_id) : null) : null,
      target_completion_date !== undefined ? target_completion_date : null,
      notes !== undefined ? notes : null,
      id
    );

    const updated = db
      .prepare(
        `SELECT
           p.*,
           p.client_name AS school_district_name,
           COALESCE(p.source_crm_deal_id, p.lead_id) AS source_crm_deal_id,
           u.first_name || ' ' || u.last_name AS assigned_pm_name,
           l.name AS lead_name,
           l.company AS lead_company
         FROM projects p
         LEFT JOIN users u ON p.assigned_pm_id = u.id
         LEFT JOIN leads l ON (p.source_crm_deal_id = l.id OR p.lead_id = l.id)
         WHERE p.id = ?`
      )
      .get(id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rule 2: Sales reps cannot delete projects. Only Management and Super Admin can delete projects.
    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json(
        { error: "Forbidden: Sales representatives cannot delete projects." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = db.prepare(`SELECT id FROM projects WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    db.prepare(`
      UPDATE projects SET
        is_deleted = 1,
        deleted_at = datetime('now'),
        deleted_by = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(user.userId, id);

    return NextResponse.json({ success: true, message: "Project moved to deleted archive" });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}

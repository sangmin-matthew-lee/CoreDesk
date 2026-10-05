import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  Project,
  ProjectCategory,
  ProjectCategorySlug,
  PROJECT_CATEGORIES,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const SLUG_TO_CATEGORY: Record<ProjectCategorySlug, ProjectCategory> = {
  development: "DEVELOPMENT",
  pge_approval: "PGE_APPROVAL",
  construction: "CONSTRUCTION",
  closeout: "CLOSEOUT",
  completed: "COMPLETED",
  on_hold: "ON_HOLD",
};

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only Management and Super Admin accounts can access the Project Management module
    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json(
        { error: "Forbidden: Management only" },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const categoryParam = searchParams.get("category");
    const search = searchParams.get("search")?.toLowerCase().trim() || "";

    // Base query for counts across all categories (only active, non-deleted projects)
    const countsResult = db
      .prepare(
        `SELECT category, COUNT(*) as count FROM projects WHERE is_deleted = 0 GROUP BY category`
      )
      .all() as { category: ProjectCategory; count: number }[];

    // Count of soft-deleted projects
    const deletedRow = db
      .prepare(`SELECT COUNT(*) as count FROM projects WHERE is_deleted = 1`)
      .get() as { count: number } | undefined;
    const deletedCount = deletedRow?.count || 0;

    const counts: Record<string, number> = {
      all: 0,
      development: 0,
      pge_approval: 0,
      construction: 0,
      closeout: 0,
      completed: 0,
      on_hold: 0,
      deleted: deletedCount,
    };

    let totalActive = 0;
    for (const row of countsResult) {
      const matchCat = PROJECT_CATEGORIES.find((c) => c.key === row.category);
      if (matchCat) {
        counts[matchCat.slug] = row.count;
      }
      if (row.category !== "COMPLETED" && row.category !== "ON_HOLD") {
        totalActive += row.count;
      }
    }
    // "All Active Projects" reflects projects in active lifecycle stages
    counts.all = totalActive;

    // Counts for items requiring review / inspection attention
    const reviewInspectionRows = db
      .prepare(
        `SELECT category, COUNT(*) as count
         FROM projects
         WHERE is_deleted = 0
           AND sub_status IN ('OBF_PRE_LA_SENT', 'PGE_PRE_INSPECTION_PENDING', 'SCHOOL_BOARD_PENDING', 'OBF_POST_LA_SENT', 'POST_INSPECTION_REQUESTED')
         GROUP BY category`
      )
      .all() as { category: ProjectCategory; count: number }[];

    const attentionCounts: Record<string, number> = {
      pge_approval: 0,
      closeout: 0,
    };

    for (const row of reviewInspectionRows) {
      if (row.category === "PGE_APPROVAL") attentionCounts.pge_approval = row.count;
      if (row.category === "CLOSEOUT") attentionCounts.closeout = row.count;
    }

    // Portfolio dollar sum for active projects
    const portfolioSum = db
      .prepare(
        `SELECT SUM(estimated_cost) as total_value FROM projects WHERE is_deleted = 0 AND category NOT IN ('COMPLETED', 'ON_HOLD')`
      )
      .get() as { total_value: number | null };

    // Build project query with filters
    const queryConditions: string[] = ["p.is_deleted = 0"];
    const queryParams: (string | number)[] = [];

    if (categoryParam && categoryParam !== "all") {
      const targetCategory =
        SLUG_TO_CATEGORY[categoryParam as ProjectCategorySlug] ||
        (Object.values(SLUG_TO_CATEGORY).includes(categoryParam as ProjectCategory)
          ? (categoryParam as ProjectCategory)
          : null);

      if (targetCategory) {
        queryConditions.push(`p.category = ?`);
        queryParams.push(targetCategory);
      }
    } else {
      // Default / "all" = All Active Projects
      queryConditions.push(`p.category NOT IN ('COMPLETED', 'ON_HOLD')`);
    }

    if (search) {
      queryConditions.push(
        `(LOWER(p.name) LIKE ? OR LOWER(p.client_name) LIKE ? OR LOWER(COALESCE(p.pge_application_id, '')) LIKE ?)`
      );
      const searchWildcard = `%${search}%`;
      queryParams.push(searchWildcard, searchWildcard, searchWildcard);
    }

    const whereClause =
      queryConditions.length > 0 ? `WHERE ${queryConditions.join(" AND ")}` : "";

    const selectQuery = `
      SELECT
        p.*,
        p.client_name AS school_district_name,
        COALESCE(p.source_crm_deal_id, p.lead_id) AS source_crm_deal_id,
        u.first_name || ' ' || u.last_name AS assigned_pm_name,
        l.company AS lead_company,
        l.name AS lead_contact_name
      FROM projects p
      LEFT JOIN users u ON p.assigned_pm_id = u.id
      LEFT JOIN leads l ON (p.source_crm_deal_id = l.id OR p.lead_id = l.id)
      ${whereClause}
      ORDER BY p.updated_at DESC
    `;

    const projects = db.prepare(selectQuery).all(...queryParams) as Project[];

    return NextResponse.json({
      projects,
      counts,
      attentionCounts,
      totalActive,
      deletedCount,
      totalPortfolioValue: portfolioSum?.total_value || 0,
    });
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only Management / Super Admin can create standalone projects directly in PM; Sales generates projects via qualified CRM leads
    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json(
        { error: "Forbidden: Sales representatives cannot create standalone projects in PM. Promote a qualified CRM lead instead." },
        { status: 403 }
      );
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
      category = "DEVELOPMENT",
      sub_status = "AUDIT_SCHEDULED",
      project_type = "Comprehensive (LED + HVAC)",
      utility_provider = "PG&E",
      pge_application_id = null,
      estimated_cost = 0,
      assigned_pm_id = null,
      target_completion_date = null,
      notes = null,
      lead_id = null,
      source_crm_deal_id = null,
      sourceCrmDealId = null,
    } = body;

    const finalClientName = (schoolDistrictName || client_name || "").trim();
    if (!name || !finalClientName) {
      return NextResponse.json(
        { error: "Project name and client / school district name are required" },
        { status: 400 }
      );
    }

    const finalSiteName = (siteName || site_name || "").trim() || null;
    const finalClientAddress = (clientAddress || client_address || "").trim() || null;
    const finalKeyContacts = typeof (keyContacts || key_contacts) === "object"
      ? JSON.stringify(keyContacts || key_contacts)
      : (keyContacts || key_contacts || null);
    const finalDealId = sourceCrmDealId || source_crm_deal_id || lead_id || null;

    const result = db
      .prepare(
        `INSERT INTO projects (
          name, client_name, client_address, site_name, key_contacts, source_crm_deal_id,
          category, sub_status, project_type, utility_provider,
          pge_application_id, estimated_cost, assigned_pm_id, target_completion_date, notes, lead_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name.trim(),
        finalClientName,
        finalClientAddress,
        finalSiteName,
        finalKeyContacts,
        finalDealId ? Number(finalDealId) : null,
        category,
        sub_status,
        project_type,
        utility_provider,
        pge_application_id ? pge_application_id.trim() : null,
        Number(estimated_cost) || 0,
        assigned_pm_id ? Number(assigned_pm_id) : user.userId,
        target_completion_date || null,
        notes || null,
        finalDealId ? Number(finalDealId) : null
      );

    const newProject = db
      .prepare(
        `SELECT p.*, u.first_name || ' ' || u.last_name AS assigned_pm_name
         FROM projects p
         LEFT JOIN users u ON p.assigned_pm_id = u.id
         WHERE p.id = ?`
      )
      .get(result.lastInsertRowid);

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

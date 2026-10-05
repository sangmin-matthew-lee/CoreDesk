import db from "@/lib/db";
import { Project } from "@/lib/types";

export interface ConvertLeadResult {
  alreadyExists: boolean;
  project: Project;
}

export function convertLeadToProject(
  leadId: number | string,
  assignedUserId?: number | null
): ConvertLeadResult {
  const lead = db.prepare(`SELECT * FROM leads WHERE id = ?`).get(leadId) as {
    id: number;
    name: string;
    company: string | null;
    title: string | null;
    email: string | null;
    phone: string | null;
    office_address: string | null;
    notes: string | null;
    sites: string | null;
    assigned_to: number | null;
  } | undefined;

  if (!lead) {
    throw new Error(`Lead #${leadId} not found`);
  }

  // Check if project already exists for this lead
  const existing = db
    .prepare(
      `SELECT p.*, u.first_name || ' ' || u.last_name AS assigned_pm_name
       FROM projects p
       LEFT JOIN users u ON p.assigned_pm_id = u.id
       WHERE p.lead_id = ? OR p.source_crm_deal_id = ?`
    )
    .get(leadId, leadId) as Project | undefined;

  if (existing) {
    return { alreadyExists: true, project: existing };
  }

  // 1. School District Name (LEA)
  const schoolDistrictName = (lead.company || lead.name || "School District").trim();

  // 2. Site Name (School Campus)
  let siteName: string | null = null;
  let estimatedCost = 0;
  if (lead.sites) {
    try {
      let parsed = typeof lead.sites === "string" ? JSON.parse(lead.sites) : lead.sites;
      while (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        siteName = parsed.map((s: { name?: string }) => s.name).filter(Boolean).join(", ");
        estimatedCost = parsed.reduce(
          (sum: number, s: { cost?: number }) => sum + (Number(s.cost) || 0),
          0
        );
      }
    } catch {}
  }
  if (!siteName) {
    siteName = `${schoolDistrictName} Main Campus`;
  }

  // 3. Key Contacts (Facility Director, CBO, Principal details copied from CRM)
  const contactsList = [];
  if (lead.name) {
    contactsList.push({
      name: lead.name,
      role: lead.title || "Facility Director / Primary Stakeholder",
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      office_address: lead.office_address || undefined,
    });
  }
  const keyContactsJson = JSON.stringify(contactsList);

  const primaryCampus = siteName ? siteName.split(",")[0].trim() : "Campus";
  const projectName = `${schoolDistrictName} (${primaryCampus}) - Energy Efficiency Retrofit`;
  let assignedPm: number | null = null;
  if (assignedUserId) {
    const userRow = db.prepare(`SELECT dept FROM users WHERE id = ?`).get(assignedUserId) as { dept: string } | undefined;
    if (userRow && (userRow.dept === "Management" || userRow.dept === "Super Admin")) {
      assignedPm = Number(assignedUserId);
    }
  }

  const result = db
    .prepare(
      `INSERT INTO projects (
        lead_id,
        source_crm_deal_id,
        name,
        client_name,
        client_address,
        site_name,
        key_contacts,
        category,
        sub_status,
        project_type,
        utility_provider,
        estimated_cost,
        assigned_pm_id,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DEVELOPMENT', 'AUDIT_SCHEDULED', 'PG&E OBF', 'PG&E', ?, ?, ?)`
    )
    .run(
      lead.id,
      lead.id,
      projectName,
      schoolDistrictName,
      lead.office_address || null,
      siteName,
      keyContactsJson,
      estimatedCost,
      assignedPm || null,
      `Qualified conversion from Sales CRM Deal #${lead.id} (${schoolDistrictName}).`
    );

  const newProject = db
    .prepare(
      `SELECT p.*, u.first_name || ' ' || u.last_name AS assigned_pm_name
       FROM projects p
       LEFT JOIN users u ON p.assigned_pm_id = u.id
       WHERE p.id = ?`
    )
    .get(result.lastInsertRowid) as Project;

  return { alreadyExists: false, project: newProject };
}

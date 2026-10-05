import db from "./db";
import {
  ServiceCall,
  ServiceCallPriority,
  ServiceCallSortField,
  ServiceCallSortDirection,
} from "./types";

/**
 * Generate a sequential ticket number in the format: sc{YY}_{NNN}
 * e.g., "sc26_001", "sc26_002"
 */
export function generateTicketNumber(dateStr?: string | null): string {
  let yearDigits = "26";
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (!isNaN(d.getTime())) {
      yearDigits = String(d.getFullYear()).slice(-2);
    }
  } catch {
    yearDigits = String(new Date().getFullYear()).slice(-2);
  }

  const prefix = `sc${yearDigits}_`;

  const rows = db
    .prepare(
      `SELECT ticket_number FROM service_calls 
       WHERE ticket_number LIKE ? 
       ORDER BY id DESC`
    )
    .all(`${prefix}%`) as { ticket_number: string }[];

  let maxNum = 0;
  for (const row of rows) {
    const parts = row.ticket_number.split("_");
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextSeq = maxNum + 1;
  const padded = String(nextSeq).padStart(3, "0");
  return `${prefix}${padded}`;
}

export interface ServiceCallFilters {
  tab?: "active" | "completed" | "scheduled_soon" | "all";
  sortField?: ServiceCallSortField;
  sortDirection?: ServiceCallSortDirection;
  search?: string;
  warranty?: "Covered" | "Non-covered" | "all";
  priority?: ServiceCallPriority | "all";
  customerId?: string;
}

export function getServiceCalls(filters: ServiceCallFilters = {}): {
  serviceCalls: ServiceCall[];
  counts: { active: number; completed: number; all: number; scheduledSoon: number };
} {
  const {
    tab = "active",
    sortField = "time",
    sortDirection = "desc",
    search = "",
    warranty = "all",
    priority = "all",
  } = filters;

  // 1. Get counts
  const countStats = db
    .prepare(
      `SELECT 
        COUNT(CASE WHEN completion_status != 'Complete' THEN 1 END) as active_count,
        COUNT(CASE WHEN completion_status = 'Complete' THEN 1 END) as completed_count,
        COUNT(*) as total_count,
        COUNT(CASE WHEN completion_status != 'Complete' AND appointed_date IS NOT NULL AND appointed_date != '' AND date(appointed_date) >= date('now') AND date(appointed_date) <= date('now', '+7 days') THEN 1 END) as scheduled_soon_count
       FROM service_calls
       WHERE is_deleted = 0`
    )
    .get() as {
    active_count: number;
    completed_count: number;
    total_count: number;
    scheduled_soon_count: number;
  };

  const counts = {
    active: countStats?.active_count || 0,
    completed: countStats?.completed_count || 0,
    all: countStats?.total_count || 0,
    scheduledSoon: countStats?.scheduled_soon_count || 0,
  };

  // 2. Build Query
  const whereClauses: string[] = ["sc.is_deleted = 0"];
  const params: unknown[] = [];

  if (tab === "active") {
    whereClauses.push("sc.completion_status != 'Complete'");
  } else if (tab === "completed") {
    whereClauses.push("sc.completion_status = 'Complete'");
  } else if (tab === "scheduled_soon") {
    whereClauses.push("sc.completion_status != 'Complete' AND sc.appointed_date IS NOT NULL AND sc.appointed_date != '' AND date(sc.appointed_date) >= date('now') AND date(sc.appointed_date) <= date('now', '+7 days')");
  }

  if (warranty && warranty !== "all") {
    whereClauses.push("(sc.warranty_labor = ? OR sc.warranty_materials = ?)");
    params.push(warranty, warranty);
  }

  if (priority && priority !== "all") {
    whereClauses.push("sc.priority = ?");
    params.push(priority);
  }

  if (search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    whereClauses.push(`(
      LOWER(sc.ticket_number) LIKE ? OR
      LOWER(sc.client_name) LIKE ? OR
      LOWER(COALESCE(sc.client_phone, '')) LIKE ? OR
      LOWER(COALESCE(sc.client_email, '')) LIKE ? OR
      LOWER(COALESCE(sc.job_site_address, '')) LIKE ? OR
      LOWER(COALESCE(sc.service_technician, '')) LIKE ? OR
      LOWER(COALESCE(sc.detail, '')) LIKE ? OR
      LOWER(COALESCE(sc.materials_needed, '')) LIKE ? OR
      LOWER(COALESCE(sc.equipment_needed, '')) LIKE ?
    )`);
    params.push(q, q, q, q, q, q, q, q, q);
  }

  // 3. Sorting
  let orderSql = "sc.request_date DESC, sc.id DESC";
  const dir = sortDirection.toUpperCase() === "ASC" ? "ASC" : "DESC";

  if (sortField === "time") {
    orderSql = `sc.request_date ${dir}, sc.id ${dir}`;
  } else if (sortField === "appointed") {
    if (dir === "ASC") {
      orderSql = `CASE WHEN sc.appointed_date IS NULL OR sc.appointed_date = '' THEN 1 ELSE 0 END, sc.appointed_date ASC, sc.id ASC`;
    } else {
      orderSql = `CASE WHEN sc.appointed_date IS NULL OR sc.appointed_date = '' THEN 1 ELSE 0 END, sc.appointed_date DESC, sc.id DESC`;
    }
  } else if (sortField === "customer") {
    orderSql = `LOWER(sc.client_name) ${dir}, sc.id ${dir}`;
  } else if (sortField === "ticket") {
    orderSql = `sc.ticket_number ${dir}, sc.id ${dir}`;
  }

  const query = `
    SELECT 
      sc.*,
      u_assignee.first_name || ' ' || u_assignee.last_name as assignee_name,
      u_completed.first_name || ' ' || u_completed.last_name as completed_by_name,
      p.name as linked_project_name
    FROM service_calls sc
    LEFT JOIN users u_assignee ON sc.assignee_id = u_assignee.id
    LEFT JOIN users u_completed ON sc.completed_by = u_completed.id
    LEFT JOIN projects p ON sc.linked_project_id = p.id
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY ${orderSql}
  `;

  const serviceCalls = db.prepare(query).all(...params) as ServiceCall[];

  return { serviceCalls, counts };
}

export function getServiceCallById(id: number): ServiceCall | null {
  const query = `
    SELECT 
      sc.*,
      u_assignee.first_name || ' ' || u_assignee.last_name as assignee_name,
      u_completed.first_name || ' ' || u_completed.last_name as completed_by_name,
      p.name as linked_project_name
    FROM service_calls sc
    LEFT JOIN users u_assignee ON sc.assignee_id = u_assignee.id
    LEFT JOIN users u_completed ON sc.completed_by = u_completed.id
    LEFT JOIN projects p ON sc.linked_project_id = p.id
    WHERE sc.id = ? AND sc.is_deleted = 0
  `;
  const call = db.prepare(query).get(id) as ServiceCall | undefined;
  return call || null;
}

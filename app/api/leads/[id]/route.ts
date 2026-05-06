import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { CHECKLIST_ITEMS } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

interface LeadRow {
  id: number;
  assigned_to: number | null;
  [key: string]: unknown;
}

function canAccessLead(
  lead: LeadRow,
  userId: number,
  dept: string
): boolean {
  if (dept === "Management") return true;
  return lead.assigned_to === userId;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const lead = db
      .prepare(
        `SELECT l.*, u.first_name || ' ' || u.last_name AS assigned_to_name
         FROM leads l
         LEFT JOIN users u ON l.assigned_to = u.id
         WHERE l.id = ?`
      )
      .get(id) as LeadRow | undefined;

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!canAccessLead(lead, user.userId, user.dept)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const checklistRows = db
      .prepare(`SELECT item_key, completed FROM lead_checklist WHERE lead_id = ?`)
      .all(id) as { item_key: string; completed: number }[];

    const checklist: Record<string, boolean> = {};
    for (const item of CHECKLIST_ITEMS) {
      const row = checklistRows.find((r) => r.item_key === item.key);
      checklist[item.key] = row ? row.completed === 1 : false;
    }

    return NextResponse.json({ ...lead, checklist });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = db.prepare(`SELECT id, assigned_to FROM leads WHERE id = ?`).get(id) as LeadRow | undefined;
    if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!canAccessLead(existing, user.userId, user.dept)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name, email, phone, company, title, notes,
      office_address, status, last_contact_date, checklist, assigned_to,
    } = body;

    // Only Management can reassign leads
    const newAssignedTo =
      user.dept === "Management" && assigned_to !== undefined
        ? assigned_to
        : existing.assigned_to;

    db.prepare(
      `UPDATE leads SET name=?, email=?, phone=?, company=?, title=?, notes=?, office_address=?, status=?, last_contact_date=?, assigned_to=?, updated_at=datetime('now') WHERE id=?`
    ).run(
      name, email || "", phone || "", company || "", title || "",
      notes || "", office_address || "", status || "Cold",
      last_contact_date || null, newAssignedTo, id
    );

    if (checklist && typeof checklist === "object") {
      const updateItem = db.prepare(
        `INSERT INTO lead_checklist (lead_id, item_key, completed, completed_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(lead_id, item_key) DO UPDATE SET completed=excluded.completed, completed_at=excluded.completed_at`
      );
      const updateMany = db.transaction(() => {
        for (const [key, value] of Object.entries(checklist)) {
          updateItem.run(id, key, value ? 1 : 0, value ? new Date().toISOString() : null);
        }
      });
      updateMany();

      // Auto-close lead when all checklist items are completed
      const completedCount = db
        .prepare(`SELECT COUNT(*) AS cnt FROM lead_checklist WHERE lead_id = ? AND completed = 1`)
        .get(id) as { cnt: number };
      const totalCount = CHECKLIST_ITEMS.length;

      if (completedCount.cnt === totalCount) {
        db.prepare(`UPDATE leads SET status = 'Closed', updated_at = datetime('now') WHERE id = ?`).run(id);
      }
    }

    const lead = db
      .prepare(
        `SELECT l.*, u.first_name || ' ' || u.last_name AS assigned_to_name
         FROM leads l LEFT JOIN users u ON l.assigned_to = u.id
         WHERE l.id = ?`
      )
      .get(id) as Record<string, unknown>;

    const checklistRows = db
      .prepare(`SELECT item_key, completed FROM lead_checklist WHERE lead_id = ?`)
      .all(id) as { item_key: string; completed: number }[];

    const updatedChecklist: Record<string, boolean> = {};
    for (const item of CHECKLIST_ITEMS) {
      const row = checklistRows.find((r) => r.item_key === item.key);
      updatedChecklist[item.key] = row ? row.completed === 1 : false;
    }

    return NextResponse.json({ ...lead, checklist: updatedChecklist });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = db.prepare(`SELECT id, assigned_to FROM leads WHERE id = ?`).get(id) as LeadRow | undefined;
    if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!canAccessLead(existing, user.userId, user.dept)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    db.prepare(`DELETE FROM leads WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}

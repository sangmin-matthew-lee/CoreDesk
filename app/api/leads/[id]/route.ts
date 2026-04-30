import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { CHECKLIST_ITEMS } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const lead = db.prepare(`SELECT * FROM leads WHERE id = ?`).get(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const checklistRows = db
      .prepare(`SELECT item_key, completed, completed_at FROM lead_checklist WHERE lead_id = ?`)
      .all(id) as { item_key: string; completed: number; completed_at: string | null }[];

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
    const { id } = await params;
    const body = await req.json();
    const { name, email, phone, company, title, notes, office_address, status, last_contact_date, checklist } = body;

    const existing = db.prepare(`SELECT id FROM leads WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    db.prepare(
      `UPDATE leads SET name=?, email=?, phone=?, company=?, title=?, notes=?, office_address=?, status=?, last_contact_date=?, updated_at=datetime('now') WHERE id=?`
    ).run(name, email || "", phone || "", company || "", title || "", notes || "", office_address || "", status || "Cold", last_contact_date || null, id);

    if (checklist && typeof checklist === "object") {
      const updateItem = db.prepare(
        `INSERT INTO lead_checklist (lead_id, item_key, completed, completed_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(lead_id, item_key) DO UPDATE SET completed=excluded.completed, completed_at=excluded.completed_at`
      );
      const updateMany = db.transaction(() => {
        for (const [key, value] of Object.entries(checklist)) {
          updateItem.run(
            id,
            key,
            value ? 1 : 0,
            value ? new Date().toISOString() : null
          );
        }
      });
      updateMany();
    }

    const lead = db.prepare(`SELECT * FROM leads WHERE id = ?`).get(id) as Record<string, unknown>;
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
    const { id } = await params;
    const existing = db.prepare(`SELECT id FROM leads WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    db.prepare(`DELETE FROM leads WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}

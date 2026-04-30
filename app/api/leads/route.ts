import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { CHECKLIST_ITEMS } from "@/lib/types";

export async function GET() {
  try {
    const leads = db
      .prepare(
        `SELECT * FROM leads ORDER BY updated_at DESC`
      )
      .all();
    return NextResponse.json(leads);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, company, title, notes, office_address, status, last_contact_date } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const result = db
      .prepare(
        `INSERT INTO leads (name, email, phone, company, title, notes, office_address, status, last_contact_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        email || "",
        phone || "",
        company || "",
        title || "",
        notes || "",
        office_address || "",
        status || "Cold",
        last_contact_date || null
      );

    const leadId = result.lastInsertRowid;

    const insertChecklist = db.prepare(
      `INSERT OR IGNORE INTO lead_checklist (lead_id, item_key, completed) VALUES (?, ?, 0)`
    );
    const insertMany = db.transaction(() => {
      for (const item of CHECKLIST_ITEMS) {
        insertChecklist.run(leadId, item.key);
      }
    });
    insertMany();

    const lead = db.prepare(`SELECT * FROM leads WHERE id = ?`).get(leadId);
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}

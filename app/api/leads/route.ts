import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { CHECKLIST_ITEMS } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let leads;
    if (user.dept === "Management") {
      leads = db
        .prepare(
          `SELECT l.*, u.first_name || ' ' || u.last_name AS assigned_to_name
           FROM leads l
           LEFT JOIN users u ON l.assigned_to = u.id
           ORDER BY l.updated_at DESC`
        )
        .all();
    } else {
      leads = db
        .prepare(
          `SELECT l.*, u.first_name || ' ' || u.last_name AS assigned_to_name
           FROM leads l
           LEFT JOIN users u ON l.assigned_to = u.id
           WHERE l.assigned_to = ?
           ORDER BY l.updated_at DESC`
        )
        .all(user.userId);
    }

    return NextResponse.json(leads);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      name, email, phone, company, title, notes,
      office_address, status, last_contact_date, assigned_to,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Sales users can only create leads assigned to themselves
    const assignedTo =
      user.dept === "Management" && assigned_to
        ? assigned_to
        : user.userId;

    const result = db
      .prepare(
        `INSERT INTO leads (name, email, phone, company, title, notes, office_address, status, last_contact_date, assigned_to)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        last_contact_date || null,
        assignedTo
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

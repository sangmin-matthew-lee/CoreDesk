import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { CHECKLIST_ITEMS } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";


export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const baseSelect = `
      SELECT
        l.*,
        u.first_name || ' ' || u.last_name AS assigned_to_name,
        (SELECT COUNT(*) FROM lead_checklist lc WHERE lc.lead_id = l.id AND lc.completed = 1) AS checklist_completed,
        (SELECT lc2.item_key FROM lead_checklist lc2 WHERE lc2.lead_id = l.id AND lc2.completed = 1 ORDER BY lc2.id DESC LIMIT 1) AS latest_stage_key
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
    `;

    let leads;
    if (user.dept === "Management" || user.dept === "Super Admin") {
      leads = db.prepare(`${baseSelect} ORDER BY l.updated_at DESC`).all();
    } else {
      leads = db
        .prepare(`${baseSelect} WHERE l.assigned_to = ? ORDER BY l.updated_at DESC`)
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
      sites, number_of_sites,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Management / Super Admin users can assign leads to anyone
    const assignedTo =
      (user.dept === "Management" || user.dept === "Super Admin") && assigned_to
        ? assigned_to
        : user.userId;

    let sitesStr = null;
    if (sites) {
      try {
        let parsed = typeof sites === "string" ? JSON.parse(sites) : sites;
        while (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
        }
        sitesStr = JSON.stringify(parsed);
      } catch {
        sitesStr = typeof sites === "string" ? sites : JSON.stringify(sites);
      }
    }
    const numberOfSitesVal = typeof number_of_sites === "number" ? number_of_sites : null;

    const result = db
      .prepare(
        `INSERT INTO leads (name, email, phone, company, title, notes, office_address, status, last_contact_date, assigned_to, sites, number_of_sites)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        assignedTo,
        sitesStr,
        numberOfSitesVal
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

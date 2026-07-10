import { NextResponse } from "next/server";
import db from "@/lib/db";
import { CHECKLIST_ITEMS } from "@/lib/types";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";


export async function GET() {
  try {
    const leads = db.prepare(`SELECT * FROM leads ORDER BY updated_at DESC`).all() as Record<string, unknown>[];

    const rows = leads.map((lead) => {
      const checklistRows = db
        .prepare(`SELECT item_key, completed FROM lead_checklist WHERE lead_id = ?`)
        .all(lead.id) as { item_key: string; completed: number }[];

      const row: Record<string, unknown> = {
        ID: lead.id,
        Name: lead.name,
        Email: lead.email,
        Phone: lead.phone,
        Company: lead.company,
        Title: lead.title,
        "Office Address": lead.office_address,
        Status: lead.status,
        "Last Contact": lead.last_contact_date || "",
        Notes: lead.notes,
        "Created At": lead.created_at,
      };

      for (const item of CHECKLIST_ITEMS) {
        const found = checklistRows.find((r) => r.item_key === item.key);
        row[item.label] = found?.completed ? "✓" : "";
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="leads_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}

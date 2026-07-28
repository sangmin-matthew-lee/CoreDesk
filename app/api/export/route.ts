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

      let projectCost = 0;
      if (lead.sites) {
        try {
          let parsed = typeof lead.sites === "string" ? JSON.parse(lead.sites) : lead.sites;
          while (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }
          if (Array.isArray(parsed)) {
            projectCost = parsed.reduce((sum, s) => sum + s.cost, 0);
          }
        } catch {
          projectCost = 0;
        }
      }

      const row: Record<string, unknown> = {
        ID: lead.id,
        Name: lead.name,
        Email: lead.email,
        Phone: lead.phone,
        Company: lead.company,
        Title: lead.title,
        "Total Project Cost": projectCost,
        "Number of Sites": lead.number_of_sites || 0,
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

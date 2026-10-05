import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateTicketNumber, getServiceCalls } from "@/lib/service-calls";
import {
  ServiceCallPriority,
  ServiceCallSortField,
  ServiceCallSortDirection,
  WarrantyStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Management and Super Admin accounts can access Service Calls
    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json(
        { error: "Forbidden: Management access only" },
        { status: 403 }
      );
    }

    const { searchParams } = req.nextUrl;
    const tab = (searchParams.get("tab") || "active") as
      | "active"
      | "completed"
      | "scheduled_soon"
      | "all";
    const sortField = (searchParams.get("sortField") || "time") as ServiceCallSortField;
    const sortDirection = (searchParams.get("sortDirection") || "desc") as ServiceCallSortDirection;
    const search = searchParams.get("search") || "";
    const warranty = (searchParams.get("warranty") || "all") as "Covered" | "Non-covered" | "all";
    const priority = (searchParams.get("priority") || "all") as ServiceCallPriority | "all";

    const result = getServiceCalls({
      tab,
      sortField,
      sortDirection,
      search,
      warranty,
      priority,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/service-calls:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Management and Super Admin accounts can create service calls
    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json(
        { error: "Forbidden: Management access only" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      client_name,
      client_phone,
      client_email,
      job_site_address,
      request_date,
      appointed_date,
      assignee_id,
      service_technician,
      warranty_labor = "Covered",
      warranty_materials = "Covered",
      detail,
      materials_needed,
      equipment_needed,
      technician_notes,
      priority = "Normal",
      completion_status = "Not yet",
      linked_project_id,
    } = body;

    if (!client_name || !client_name.trim()) {
      return NextResponse.json(
        { error: "Client name is required" },
        { status: 400 }
      );
    }

    const reqDate = request_date || new Date().toISOString().replace("T", " ").substring(0, 19);
    const ticketNumber = body.ticket_number || generateTicketNumber(reqDate);

    const isComplete = completion_status === "Complete";
    const completedAt = isComplete ? new Date().toISOString().replace("T", " ").substring(0, 19) : null;
    const completedBy = isComplete ? user.userId : null;

    const stmt = db.prepare(`
      INSERT INTO service_calls (
        ticket_number,
        client_name,
        client_phone,
        client_email,
        job_site_address,
        request_date,
        appointed_date,
        assignee_id,
        service_technician,
        warranty_labor,
        warranty_materials,
        detail,
        materials_needed,
        equipment_needed,
        technician_notes,
        priority,
        completion_status,
        completed_at,
        completed_by,
        linked_project_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      ticketNumber,
      client_name.trim(),
      client_phone?.trim() || null,
      client_email?.trim() || null,
      job_site_address?.trim() || null,
      reqDate,
      appointed_date || null,
      assignee_id ? Number(assignee_id) : user.userId,
      service_technician?.trim() || null,
      warranty_labor as WarrantyStatus,
      warranty_materials as WarrantyStatus,
      detail?.trim() || null,
      materials_needed?.trim() || null,
      equipment_needed?.trim() || null,
      technician_notes?.trim() || null,
      priority as ServiceCallPriority,
      completion_status,
      completedAt,
      completedBy,
      linked_project_id ? Number(linked_project_id) : null
    );

    return NextResponse.json({
      success: true,
      id: Number(info.lastInsertRowid),
      ticket_number: ticketNumber,
    });
  } catch (error) {
    console.error("Error in POST /api/service-calls:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

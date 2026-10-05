import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getServiceCallById } from "@/lib/service-calls";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json(
        { error: "Forbidden: Management access only" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const ticketId = parseInt(id, 10);
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const serviceCall = getServiceCallById(ticketId);
    if (!serviceCall) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(serviceCall);
  } catch (error) {
    console.error("Error in GET /api/service-calls/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json(
        { error: "Forbidden: Management access only" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const ticketId = parseInt(id, 10);
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const existing = getServiceCallById(ticketId);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();

    const allowedFields = [
      "client_name",
      "client_phone",
      "client_email",
      "job_site_address",
      "request_date",
      "appointed_date",
      "assignee_id",
      "service_technician",
      "warranty_labor",
      "warranty_materials",
      "detail",
      "materials_needed",
      "equipment_needed",
      "technician_notes",
      "priority",
      "completion_status",
      "linked_project_id",
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        let val = body[field];
        if (typeof val === "string") val = val.trim() || null;
        if (field === "assignee_id" || field === "linked_project_id") {
          val = val ? Number(val) : null;
        }

        updates.push(`${field} = ?`);
        values.push(val);
      }
    }

    // Handle completion status transition
    if ("completion_status" in body) {
      if (body.completion_status === "Complete") {
        if (!existing.completed_at) {
          const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);
          updates.push("completed_at = ?");
          values.push(nowStr);
          updates.push("completed_by = ?");
          values.push(user.userId);
        }
      } else {
        // Re-opened or marked Not yet
        updates.push("completed_at = NULL");
        updates.push("completed_by = NULL");
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(existing);
    }

    updates.push("updated_at = datetime('now')");

    const sql = `UPDATE service_calls SET ${updates.join(", ")} WHERE id = ?`;
    values.push(ticketId);

    db.prepare(sql).run(...values);

    const updated = getServiceCallById(ticketId);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error in PATCH /api/service-calls/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json(
        { error: "Forbidden: Management access only" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const ticketId = parseInt(id, 10);
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);
    db.prepare(`
      UPDATE service_calls 
      SET is_deleted = 1, deleted_at = ?, deleted_by = ? 
      WHERE id = ?
    `).run(nowStr, user.userId, ticketId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/service-calls/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

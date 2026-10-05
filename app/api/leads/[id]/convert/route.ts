import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { convertLeadToProject } from "@/lib/projects";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const lead = db
      .prepare(`SELECT id, assigned_to FROM leads WHERE id = ?`)
      .get(id) as { id: number; assigned_to: number | null } | undefined;

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const isManagement = user.dept === "Management" || user.dept === "Super Admin";

    // Rule 1: Management accounts can generate any lead to project
    // Rule 2: Sales accounts ONLY can make their own lead to project
    if (!isManagement && lead.assigned_to !== user.userId) {
      return NextResponse.json(
        { error: "Forbidden: Sales representatives can only convert leads assigned to them." },
        { status: 403 }
      );
    }

    // If management converts, they can be set as PM; for sales contractors, assigned PM is null until Management assigns one
    const assignedPmId = isManagement ? user.userId : null;
    const result = convertLeadToProject(id, assignedPmId);

    return NextResponse.json({
      success: true,
      alreadyExists: result.alreadyExists,
      project: result.project,
    });
  } catch (error: unknown) {
    console.error("Failed to convert lead to OBF project:", error);
    const message = error instanceof Error ? error.message : "Failed to convert lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (currentUser.dept !== "Management") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (userId === currentUser.userId) {
      return NextResponse.json(
        { error: "You cannot block your own account" },
        { status: 400 }
      );
    }

    // Check if user to modify exists and is NOT management
    const targetUser = db
      .prepare("SELECT id, dept FROM users WHERE id = ?")
      .get(userId) as { id: number; dept: string } | undefined;

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.dept === "Management") {
      return NextResponse.json(
        { error: "Cannot modify or block Management level accounts" },
        { status: 403 }
      );
    }

    const { blocked } = await req.json();
    if (typeof blocked !== "boolean") {
      return NextResponse.json({ error: "Invalid blocked status value" }, { status: 400 });
    }

    db.prepare("UPDATE users SET blocked = ? WHERE id = ?").run(blocked ? 1 : 0, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user block status:", error);
    return NextResponse.json({ error: "Failed to update user status" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (currentUser.dept !== "Management") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (userId === currentUser.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check if user to delete exists and is NOT management
    const targetUser = db
      .prepare("SELECT id, dept FROM users WHERE id = ?")
      .get(userId) as { id: number; dept: string } | undefined;

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.dept === "Management") {
      return NextResponse.json(
        { error: "Cannot delete Management level accounts" },
        { status: 403 }
      );
    }

    db.prepare("DELETE FROM users WHERE id = ?").run(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

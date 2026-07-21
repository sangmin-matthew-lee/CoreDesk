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
    if (currentUser.dept !== "Management" && currentUser.dept !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (userId === currentUser.userId) {
      return NextResponse.json(
        { error: "You cannot block or modify your own account" },
        { status: 400 }
      );
    }

    // Check target user permissions
    const targetUser = db
      .prepare("SELECT id, dept FROM users WHERE id = ?")
      .get(userId) as { id: number; dept: string } | undefined;

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.dept === "Super Admin" && currentUser.dept !== "Super Admin") {
      return NextResponse.json(
        { error: "Cannot modify Super Admin accounts" },
        { status: 403 }
      );
    }

    if (targetUser.dept === "Management" && currentUser.dept === "Management") {
      return NextResponse.json(
        { error: "Management level admins cannot modify Management accounts" },
        { status: 403 }
      );
    }

    const body = await req.json();

    if ("blocked" in body) {
      const { blocked } = body;
      if (typeof blocked !== "boolean") {
        return NextResponse.json({ error: "Invalid blocked status value" }, { status: 400 });
      }
      db.prepare("UPDATE users SET blocked = ? WHERE id = ?").run(blocked ? 1 : 0, userId);
    }

    if ("approved" in body) {
      const { approved } = body;
      if (typeof approved !== "boolean") {
        return NextResponse.json({ error: "Invalid approved status value" }, { status: 400 });
      }
      db.prepare("UPDATE users SET approved = ? WHERE id = ?").run(approved ? 1 : 0, userId);
    }

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
    if (currentUser.dept !== "Management" && currentUser.dept !== "Super Admin") {
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

    // Check target user permissions
    const targetUser = db
      .prepare("SELECT id, dept FROM users WHERE id = ?")
      .get(userId) as { id: number; dept: string } | undefined;

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.dept === "Super Admin" && currentUser.dept !== "Super Admin") {
      return NextResponse.json(
        { error: "Cannot delete Super Admin accounts" },
        { status: 403 }
      );
    }

    if (targetUser.dept === "Management" && currentUser.dept === "Management") {
      return NextResponse.json(
        { error: "Management level admins cannot delete Management accounts" },
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

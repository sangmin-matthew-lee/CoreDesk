import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = db
      .prepare("SELECT first_name, last_name, email, phone, dept FROM users WHERE id = ?")
      .get(session.userId) as { first_name: string; last_name: string; email: string; phone: string | null; dept: string } | undefined;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone, currentPassword, newPassword, confirmPassword } = await req.json();

    const userRow = db
      .prepare("SELECT password_hash FROM users WHERE id = ?")
      .get(session.userId) as { password_hash: string } | undefined;

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Handle password change if currentPassword is provided
    let newPasswordHash: string | null = null;
    if (currentPassword) {
      const valid = await bcrypt.compare(currentPassword, userRow.password_hash);
      if (!valid) {
        return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
      }

      if (!newPassword || !confirmPassword) {
        return NextResponse.json({ error: "New password and confirmation are required" }, { status: 400 });
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json({ error: "New passwords do not match" }, { status: 400 });
      }

      if (newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters long" }, { status: 400 });
      }

      newPasswordHash = await bcrypt.hash(newPassword, 12);
    }

    if (newPasswordHash) {
      db.prepare("UPDATE users SET phone = ?, password_hash = ? WHERE id = ?").run(
        (phone || "").trim(),
        newPasswordHash,
        session.userId
      );
    } else {
      db.prepare("UPDATE users SET phone = ? WHERE id = ?").run(
        (phone || "").trim(),
        session.userId
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

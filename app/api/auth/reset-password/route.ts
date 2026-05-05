import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

interface UserRow {
  id: number;
  first_name: string;
  email: string;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = db
      .prepare(`SELECT id, first_name, email FROM users WHERE email = ?`)
      .get(email.toLowerCase().trim()) as UserRow | undefined;

    // Always return success to prevent user enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Invalidate old tokens for this user
    db.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ?`).run(user.id);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.prepare(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`
    ).run(user.id, token, expiresAt);

    const appUrl = process.env.APP_URL || "http://localhost:3001";
    const resetUrl = `${appUrl}/reset-password/${token}`;

    await sendPasswordResetEmail(user.email, user.first_name, resetUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}

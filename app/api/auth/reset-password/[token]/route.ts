import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";

interface TokenRow {
  id: number;
  user_id: number;
  expires_at: string;
  used: number;
}

type Params = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const { password, confirmPassword } = await req.json();

    if (!password || !confirmPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const resetToken = db
      .prepare(
        `SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = ?`
      )
      .get(token) as TokenRow | undefined;

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    if (resetToken.used) {
      return NextResponse.json(
        { error: "This reset link has already been used" },
        { status: 400 }
      );
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(
      passwordHash,
      resetToken.user_id
    );

    db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE id = ?`).run(
      resetToken.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Password reset failed" }, { status: 500 });
  }
}

// Validate token (GET) — used by the reset page to check if token is still valid
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const resetToken = db
    .prepare(
      `SELECT expires_at, used FROM password_reset_tokens WHERE token = ?`
    )
    .get(token) as { expires_at: string; used: number } | undefined;

  if (!resetToken || resetToken.used || new Date(resetToken.expires_at) < new Date()) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({ valid: true });
}

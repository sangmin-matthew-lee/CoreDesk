import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import type { Dept } from "@/lib/types";

export const dynamic = "force-dynamic";


function generateTempPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars[crypto.randomInt(0, chars.length)];
  }
  return password;
}

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (currentUser.dept !== "Management") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = db
    .prepare(
      `SELECT id, first_name, last_name, email, phone, dept, blocked, requires_password_change, approved, created_at 
       FROM users 
       ORDER BY first_name`
    )
    .all();

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (currentUser.dept !== "Management") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { firstName, lastName, email, dept } = await req.json();

    if (!firstName || !lastName || !email || !dept) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!["Sales", "Management"].includes(dept)) {
      return NextResponse.json({ error: "Invalid department" }, { status: 400 });
    }

    const existing = db
      .prepare(`SELECT id FROM users WHERE email = ?`)
      .get(email.toLowerCase().trim());

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    db.prepare(
      `INSERT INTO users (first_name, last_name, email, password_hash, dept, requires_password_change, blocked)
       VALUES (?, ?, ?, ?, ?, 1, 0)`
    ).run(
      firstName.trim(),
      lastName.trim(),
      email.toLowerCase().trim(),
      passwordHash,
      dept as Dept
    );

    await sendWelcomeEmail(email.toLowerCase().trim(), firstName.trim(), tempPassword);

    return NextResponse.json({ success: true, tempPassword }, { status: 201 });
  } catch (error) {
    console.error("User registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}


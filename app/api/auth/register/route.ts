import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, password } = await req.json();

    if (!firstName || !lastName || !email || !phone || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.toLowerCase().trim();

    const existing = db
      .prepare(`SELECT id FROM users WHERE email = ?`)
      .get(trimmedEmail);

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    db.prepare(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, dept, requires_password_change, blocked, approved)
       VALUES (?, ?, ?, ?, ?, 'Sales', 0, 0, 0)`
    ).run(
      firstName.trim(),
      lastName.trim(),
      trimmedEmail,
      phone.trim(),
      passwordHash
    );

    return NextResponse.json(
      { success: true, message: "Registration successful. Please wait for admin approval." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Self-registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

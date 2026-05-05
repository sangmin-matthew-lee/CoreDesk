import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { signToken, TOKEN_COOKIE, TOKEN_MAX_AGE } from "@/lib/jwt";
import type { Dept } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, password, confirmPassword, dept } =
      await req.json();

    if (!firstName || !lastName || !email || !password || !dept) {
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

    const passwordHash = await bcrypt.hash(password, 12);

    const result = db
      .prepare(
        `INSERT INTO users (first_name, last_name, email, password_hash, dept)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        firstName.trim(),
        lastName.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        dept as Dept
      );

    const token = await signToken({
      userId: result.lastInsertRowid as number,
      email: email.toLowerCase().trim(),
      dept: dept as Dept,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });

    const res = NextResponse.json({ success: true }, { status: 201 });
    res.cookies.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE,
      path: "/",
    });
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

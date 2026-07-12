import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { signToken, TOKEN_COOKIE, TOKEN_MAX_AGE } from "@/lib/jwt";
import type { Dept } from "@/lib/types";

interface UserRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  dept: Dept;
  blocked: number;
  approved: number;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = db
      .prepare(`SELECT * FROM users WHERE email = ?`)
      .get(email.toLowerCase().trim()) as UserRow | undefined;

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (user.approved === 0) {
      return NextResponse.json(
        { error: "Your account is pending approval from an administrator." },
        { status: 403 }
      );
    }

    if (user.blocked === 1) {
      return NextResponse.json(
        { error: "Your account has been blocked. Please contact management." },
        { status: 403 }
      );
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      dept: user.dept,
      firstName: user.first_name,
      lastName: user.last_name,
    });

    const res = NextResponse.json({ success: true, dept: user.dept });
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
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

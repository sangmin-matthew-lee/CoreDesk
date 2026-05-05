import { NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/jwt";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(TOKEN_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return res;
}

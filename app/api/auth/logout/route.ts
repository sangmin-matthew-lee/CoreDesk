import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const reason = url.searchParams.get("reason");
  
  let redirectUrl = "/login";
  if (reason === "blocked") {
    redirectUrl = "/login?error=blocked";
  }

  const res = NextResponse.redirect(new URL(redirectUrl, req.url));
  res.cookies.set(TOKEN_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return res;
}


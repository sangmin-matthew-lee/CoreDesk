import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, TOKEN_COOKIE } from "@/lib/jwt";

// Paths that don't require auth
const AUTH_PAGES = ["/login", "/register", "/reset-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow API auth routes through
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const user = token ? await verifyToken(token) : null;

  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  // Redirect authenticated users away from auth pages
  if (isAuthPage) {
    if (user) {
      return NextResponse.redirect(new URL("/sales", request.url));
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)" ],
};

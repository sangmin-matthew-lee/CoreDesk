import { cookies } from "next/headers";
import { verifyToken, TOKEN_COOKIE, type JWTPayload } from "./jwt";
import db from "./db";

export async function getCurrentUser(checkBlocked = true): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;

  if (checkBlocked) {
    const dbUser = db.prepare("SELECT blocked, approved FROM users WHERE id = ?").get(payload.userId) as { blocked: number; approved: number } | undefined;
    if (!dbUser || dbUser.blocked || !dbUser.approved) {
      return null;
    }
  }

  return payload;
}

export type { JWTPayload };


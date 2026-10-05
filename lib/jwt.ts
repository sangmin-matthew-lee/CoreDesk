import { SignJWT, jwtVerify } from "jose";
import type { Dept } from "./types";

export interface JWTPayload {
  userId: number;
  email: string;
  dept: Dept;
  firstName: string;
  lastName: string;
}

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    console.warn("⚠️ [SECURITY WARNING] JWT_SECRET environment variable is not set! Using default fallback is insecure in production.");
  }
  return new TextEncoder().encode(
    secret || "coredesk-dev-secret-please-change-in-production"
  );
};

export const TOKEN_COOKIE = "coredesk_token";
export const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

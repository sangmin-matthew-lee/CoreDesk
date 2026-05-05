import { SignJWT, jwtVerify } from "jose";
import type { Dept } from "./types";

export interface JWTPayload {
  userId: number;
  email: string;
  dept: Dept;
  firstName: string;
  lastName: string;
}

const getSecret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || "coredesk-dev-secret-please-change-in-production"
  );

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

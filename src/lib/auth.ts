import { createHash, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE_NAME = "tt_admin_session";

export function expectedAdminToken(): string {
  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.ADMIN_SECRET ?? "";
  return createHash("sha256").update(`${password}:${secret}`).digest("hex");
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function isValidAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  return timingSafeStringEqual(token, expectedAdminToken());
}

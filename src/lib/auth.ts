import { createHash } from "crypto";

export const ADMIN_COOKIE_NAME = "tt_admin_session";

export function expectedAdminToken(): string {
  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.ADMIN_SECRET ?? "";
  return createHash("sha256").update(`${password}:${secret}`).digest("hex");
}

export function isValidAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  return token === expectedAdminToken();
}

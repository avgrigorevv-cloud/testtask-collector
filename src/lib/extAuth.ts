// Auth for the browser extension ("capture" logins). Separate from the single
// admin password on purpose: every extension login owns its own folder of
// captures, and the admin manages logins in /admin/captures.
import { createHash, randomBytes } from "crypto";
import { hash, hashSync, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const EXT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const LOGIN_RE = /^[a-zA-Z0-9._-]{3,40}$/;
export const MIN_PASSWORD_LENGTH = 8;

export function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

export function validateNewCredentials(login: unknown, password: unknown): string | null {
  if (typeof login !== "string" || !LOGIN_RE.test(normalizeLogin(login))) {
    return "Логин: 3–40 символов, латиница, цифры, точка, дефис, подчёркивание";
  }
  return validateNewPassword(password);
}

export function validateNewPassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Пароль: минимум ${MIN_PASSWORD_LENGTH} символов`;
  }
  // bcrypt only uses the first 72 bytes (Cyrillic letters take 2 bytes each)
  if (Buffer.byteLength(password, "utf8") > 72) return "Пароль слишком длинный";
  return null;
}

// bcrypt hash of a random string, computed once at startup and used to
// equalize response time for unknown logins.
export const DUMMY_HASH = hashSync(randomBytes(16).toString("hex"), 10);

export function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function createExtSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.extSession.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + EXT_SESSION_TTL_MS),
    },
  });
  return token;
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match ? match[1] : null;
}

// Returns the logged-in extension user, or null if the bearer token is
// missing, unknown or expired.
export async function getExtUser(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  const session = await prisma.extSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.extSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
}

export async function deleteExtSession(request: Request): Promise<void> {
  const token = bearerToken(request);
  if (!token) return;
  await prisma.extSession.deleteMany({ where: { tokenHash: sha256(token) } });
}

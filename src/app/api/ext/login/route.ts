import { NextResponse } from "next/server";
import { extPreflight, withExtCors } from "@/lib/extCors";
import { prisma } from "@/lib/prisma";
import { DUMMY_HASH, createExtSession, normalizeLogin, verifyPassword } from "@/lib/extAuth";
import { isRateLimited, clientIp } from "@/lib/rateLimit";

// Login for the browser extension. Returns a bearer token that the extension
// keeps in chrome.storage and sends as `Authorization: Bearer <token>`.
export const POST = withExtCors(async function postHandler(request: Request) {
  const ip = clientIp(request);
  if (isRateLimited(`ext-login:${ip}`, 10, 5 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много попыток входа, попробуйте позже" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const { login, password } = (body ?? {}) as { login?: unknown; password?: unknown };
  if (typeof login !== "string" || typeof password !== "string" || !login || !password) {
    return NextResponse.json({ error: "Введите логин и пароль" }, { status: 400 });
  }

  const normalized = normalizeLogin(login);
  // Per-login limit on top of the per-IP one: X-Forwarded-For can be spoofed
  // if the app port is reachable without the reverse proxy.
  if (isRateLimited(`ext-login-user:${normalized}`, 10, 5 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много попыток входа, попробуйте позже" },
      { status: 429 }
    );
  }

  const user = await prisma.extUser.findUnique({ where: { login: normalized } });
  // Always run bcrypt (against a dummy hash for unknown logins) so response
  // time doesn't reveal which logins exist. Same message for both cases.
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  const token = await createExtSession(user.id);
  return NextResponse.json({ token, login: user.login });
});

export function OPTIONS(request: Request) {
  return extPreflight(request);
}

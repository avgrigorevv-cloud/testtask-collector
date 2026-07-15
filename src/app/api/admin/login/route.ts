import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, expectedAdminToken, timingSafeStringEqual } from "@/lib/auth";
import { isRateLimited, clientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (isRateLimited(`login:${ip}`, 10, 5 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много попыток входа, попробуйте позже" },
      { status: 429 }
    );
  }

  const { password } = await request.json();
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";

  if (
    typeof password !== "string" ||
    !expectedPassword ||
    !timingSafeStringEqual(password, expectedPassword)
  ) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, expectedAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

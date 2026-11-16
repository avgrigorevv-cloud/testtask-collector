import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, normalizeLogin, validateNewCredentials } from "@/lib/extAuth";

// Admin-only (guarded by src/proxy.ts): create an extension login.
export async function POST(request: Request) {
  const { login, password } = ((await request.json().catch(() => null)) ?? {}) as {
    login?: unknown;
    password?: unknown;
  };
  const error = validateNewCredentials(login, password);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  const normalized = normalizeLogin(login as string);
  const exists = await prisma.extUser.findUnique({ where: { login: normalized } });
  if (exists) {
    return NextResponse.json({ error: "Такой логин уже есть" }, { status: 409 });
  }
  try {
    const user = await prisma.extUser.create({
      data: { login: normalized, passwordHash: await hashPassword(password as string) },
    });
    return NextResponse.json({ id: user.id, login: user.login });
  } catch (e) {
    // Two concurrent creates of the same login: unique constraint.
    if ((e as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "Такой логин уже есть" }, { status: 409 });
    }
    throw e;
  }
}

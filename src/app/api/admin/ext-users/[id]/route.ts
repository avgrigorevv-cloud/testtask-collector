import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validateNewPassword } from "@/lib/extAuth";

type Params = { params: Promise<{ id: string }> };

// Admin-only (guarded by src/proxy.ts): set a new password for an extension
// login. Existing extension sessions of that login are revoked.
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { password } = ((await request.json().catch(() => null)) ?? {}) as { password?: unknown };
  const error = validateNewPassword(password);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  const user = await prisma.extUser.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await prisma.$transaction([
    prisma.extUser.update({
      where: { id },
      data: { passwordHash: await hashPassword(password as string) },
    }),
    prisma.extSession.deleteMany({ where: { userId: id } }),
  ]);
  return NextResponse.json({ ok: true });
}

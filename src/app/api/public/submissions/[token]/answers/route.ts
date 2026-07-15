import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const { blockId, type, value } = (await request.json()) as {
    blockId: string;
    type: string;
    value: unknown;
  };

  if (!blockId || !type) {
    return NextResponse.json({ error: "blockId и type обязательны" }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({ where: { token } });
  if (!submission) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (submission.status === "submitted") {
    return NextResponse.json({ error: "already submitted" }, { status: 403 });
  }

  await prisma.answer.upsert({
    where: { submissionId_blockId: { submissionId: submission.id, blockId } },
    update: { value: JSON.stringify(value), type },
    create: {
      submissionId: submission.id,
      blockId,
      type,
      value: JSON.stringify(value),
    },
  });

  return NextResponse.json({ ok: true });
}

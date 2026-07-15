import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/lib/blocks";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { template: true, answers: true },
  });

  if (!submission) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const blocks = JSON.parse(submission.template.blocks) as Block[];
  const answersByBlockId = Object.fromEntries(
    submission.answers.map((a) => [a.blockId, JSON.parse(a.value)])
  );

  return NextResponse.json({
    id: submission.id,
    token: submission.token,
    candidateName: submission.candidateName,
    status: submission.status,
    createdAt: submission.createdAt,
    submittedAt: submission.submittedAt,
    template: {
      id: submission.template.id,
      name: submission.template.name,
      roleLabel: submission.template.roleLabel,
    },
    blocks,
    answers: answersByBlockId,
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.submission.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

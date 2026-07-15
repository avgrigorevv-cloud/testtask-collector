import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/lib/blocks";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const submission = await prisma.submission.findUnique({
    where: { token },
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
    status: submission.status,
    candidateName: submission.candidateName,
    submittedAt: submission.submittedAt,
    template: {
      name: submission.template.name,
      roleLabel: submission.template.roleLabel,
      description: submission.template.description,
    },
    blocks,
    answers: answersByBlockId,
  });
}

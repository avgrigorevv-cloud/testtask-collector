import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDisplayOnlyBlock, type Block } from "@/lib/blocks";
import { isAnswerValueFilled } from "@/lib/validate";

type Params = { params: Promise<{ token: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { token } = await params;
  const submission = await prisma.submission.findUnique({
    where: { token },
    include: { template: true, answers: true },
  });

  if (!submission) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (submission.status === "submitted") {
    return NextResponse.json({ ok: true });
  }

  const blocks = JSON.parse(submission.template.blocks) as Block[];
  const answersByBlockId = Object.fromEntries(
    submission.answers.map((a) => [a.blockId, JSON.parse(a.value)])
  );

  const missing = blocks
    .filter((b) => b.required && !isDisplayOnlyBlock(b.type))
    .filter((b) => !isAnswerValueFilled(b.type, answersByBlockId[b.id]))
    .map((b) => b.id);

  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Заполнены не все обязательные поля", missing },
      { status: 400 }
    );
  }

  await prisma.submission.update({
    where: { id: submission.id },
    data: { status: "submitted", submittedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

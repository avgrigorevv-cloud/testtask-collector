import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/lib/blocks";
import { CandidateFlow } from "@/components/candidate/CandidateFlow";

export const dynamic = "force-dynamic";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let submission = await prisma.submission.findUnique({
    where: { token },
    include: { template: true, answers: true },
  });
  if (!submission) notFound();

  if (submission.status === "pending") {
    submission = await prisma.submission.update({
      where: { id: submission.id },
      data: { status: "opened", openedAt: new Date() },
      include: { template: true, answers: true },
    });
  }

  const blocks = JSON.parse(submission.template.blocks) as Block[];
  const answers = Object.fromEntries(
    submission.answers.map((a) => [a.blockId, JSON.parse(a.value)])
  );

  return (
    <CandidateFlow
      token={token}
      templateName={submission.template.name}
      roleLabel={submission.template.roleLabel}
      description={submission.template.description ?? ""}
      estimatedDuration={submission.template.estimatedDuration ?? ""}
      blocks={blocks}
      initialAnswers={answers}
      initialStatus={submission.status}
    />
  );
}

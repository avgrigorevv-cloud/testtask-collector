import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/lib/blocks";
import { CandidateFlow } from "@/components/candidate/CandidateFlow";
import { isSubmissionExpired } from "@/lib/submissionExpiry";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

// Read-only, same as opengraph-image.tsx alongside this route — must not
// mutate submission status (bots fetch this for link previews).
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const submission = await prisma.submission.findUnique({
    where: { token },
    include: { template: true },
  });
  if (!submission) return {};

  return {
    title: {
      absolute: `${submission.template.roleLabel} — ${submission.template.name}`,
    },
    description:
      submission.template.description || "Тестовое задание для кандидата.",
  };
}

export default async function CandidatePage({ params }: Params) {
  const { token } = await params;
  const submission = await prisma.submission.findUnique({
    where: { token },
    include: { template: true, answers: true },
  });
  if (!submission) notFound();

  if (submission.status !== "submitted" && isSubmissionExpired(submission.expiresAt)) {
    return (
      <div className="min-h-screen bg-slate-50 max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Ссылка истекла</h1>
        <p className="text-slate-500 mt-2">
          Срок действия этой ссылки на задание «{submission.template.name}» закончился.
          Свяжитесь с тем, кто её отправил, чтобы получить новую.
        </p>
      </div>
    );
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

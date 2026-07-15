import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Block, ImageAnnotateAnswerValue } from "@/lib/blocks";
import { ImageAnnotate } from "@/components/shared/ImageAnnotate";

export const dynamic = "force-dynamic";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { template: true, answers: true },
  });
  if (!submission) notFound();

  const blocks = JSON.parse(submission.template.blocks) as Block[];
  const answers = Object.fromEntries(
    submission.answers.map((a) => [a.blockId, JSON.parse(a.value)])
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/templates/${submission.templateId}/submissions`}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← {submission.template.name}
        </Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl font-semibold text-slate-900">
            {submission.candidateName || "Без имени"}
          </h1>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              submission.status === "submitted"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {submission.status === "submitted" ? "Отправлено" : "В процессе"}
          </span>
        </div>
        {submission.submittedAt && (
          <p className="text-xs text-slate-400 mt-1">
            Отправлено {new Date(submission.submittedAt).toLocaleString("ru-RU")}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {blocks.map((block) => (
          <div key={block.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              {block.title || "Без названия"}
            </p>
            {block.description && (
              <p className="text-sm text-slate-500 mb-3">{block.description}</p>
            )}

            {block.type === "attachment" && (
              <ul className="space-y-1">
                {block.config.files.map((f, i) => (
                  <li key={i}>
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {f.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {block.type === "link" && (
              <AnswerLink value={answers[block.id]} />
            )}

            {block.type === "text" && (
              <AnswerText value={answers[block.id]} />
            )}

            {block.type === "file_upload" && (
              <AnswerFiles value={answers[block.id]} />
            )}

            {block.type === "image_annotate" && (
              <ImageAnnotate
                images={block.config.images}
                pins={
                  (answers[block.id] as ImageAnnotateAnswerValue | undefined)?.pins ?? []
                }
                readOnly
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnswerLink({ value }: { value?: { url?: string } }) {
  if (!value?.url) return <EmptyAnswer />;
  return (
    <a
      href={value.url}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-blue-600 hover:underline break-all"
    >
      {value.url}
    </a>
  );
}

function AnswerText({ value }: { value?: { text?: string } }) {
  if (!value?.text) return <EmptyAnswer />;
  return <p className="text-sm text-slate-700 whitespace-pre-wrap">{value.text}</p>;
}

function AnswerFiles({ value }: { value?: { files?: { url: string; name: string }[] } }) {
  if (!value?.files?.length) return <EmptyAnswer />;
  return (
    <ul className="space-y-1">
      {value.files.map((f, i) => (
        <li key={i}>
          <a
            href={f.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            {f.name}
          </a>
        </li>
      ))}
    </ul>
  );
}

function EmptyAnswer() {
  return <p className="text-sm text-slate-400 italic">нет ответа</p>;
}

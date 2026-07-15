import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateSubmissionButton } from "@/components/admin/CreateSubmissionButton";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  pending: "Не завершено",
  submitted: "Отправлено",
};

export default async function TemplateSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) notFound();

  const submissions = await prisma.submission.findMany({
    where: { templateId: id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/templates/${id}`} className="text-sm text-slate-500 hover:text-slate-900">
          ← {template.name}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mt-1">Прохождения</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <CreateSubmissionButton templateId={id} />
      </div>

      {submissions.length === 0 && (
        <p className="text-sm text-slate-400">Пока нет ни одной ссылки для кандидата.</p>
      )}

      <div className="space-y-2">
        {submissions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
          >
            <div>
              <Link
                href={`/admin/submissions/${s.id}`}
                className="font-medium text-slate-900 hover:underline"
              >
                {s.candidateName || "Без имени"}
              </Link>
              <p className="text-xs text-slate-400 mt-0.5">
                {STATUS_LABELS[s.status] ?? s.status} · создано{" "}
                {new Date(s.createdAt).toLocaleDateString("ru-RU")}
              </p>
            </div>
            <CopyLinkButton path={`/t/${s.token}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateSubmissionButton } from "@/components/admin/CreateSubmissionButton";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { DeleteSubmissionButton } from "@/components/admin/DeleteSubmissionButton";
import { BackLink } from "@/components/admin/BackLink";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

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
        <BackLink href={`/admin/templates/${id}`}>{template.name}</BackLink>
        <h1 className="text-2xl font-semibold text-foreground mt-3">Прохождения</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <CreateSubmissionButton templateId={id} />
      </div>

      {submissions.length === 0 && (
        <p className="text-sm text-slate-400">Пока нет ни одной ссылки для кандидата.</p>
      )}

      <div className="space-y-2">
        {submissions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md hover:-translate-y-0.5"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">
                  Прохождение #{s.id.slice(-6)}
                </p>
                <StatusBadge status={s.status} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                создано {new Date(s.createdAt).toLocaleDateString("ru-RU")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/submissions/${s.id}`}
                className="rounded-lg bg-gradient-to-br from-accent to-accent-deep text-white px-3 py-1.5 text-xs font-medium hover:brightness-110 transition"
              >
                Смотреть ответ
              </Link>
              <CopyLinkButton path={`/t/${s.token}`} />
              <DeleteSubmissionButton submissionId={s.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateSubmissionButton } from "@/components/admin/CreateSubmissionButton";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { DeleteSubmissionButton } from "@/components/admin/DeleteSubmissionButton";
import { BackLink } from "@/components/admin/BackLink";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  pending: "В работе",
  opened: "Открыто кандидатом",
  submitted: "Ответ получен",
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
        <BackLink href={`/admin/templates/${id}`}>{template.name}</BackLink>
        <h1 className="text-2xl font-semibold text-slate-900 mt-3">Прохождения</h1>
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
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900">
                  {s.candidateName || "Без имени"}
                </p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    s.status === "submitted"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {STATUS_LABELS[s.status] ?? s.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                создано {new Date(s.createdAt).toLocaleDateString("ru-RU")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/submissions/${s.id}`}
                className="rounded-md bg-slate-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-slate-800"
              >
                Смотреть ответ
              </Link>
              <CopyLinkButton path={`/t/${s.token}`} />
              <DeleteSubmissionButton submissionId={s.id} candidateName={s.candidateName || "Без имени"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

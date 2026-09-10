import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/lib/blocks";
import { DeleteTemplateButton } from "@/components/admin/DeleteTemplateButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [templates, submissionsTotal, submissionsDone] = await Promise.all([
    prisma.template.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.submission.count(),
    prisma.submission.count({ where: { status: "submitted" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Шаблоны заданий</h1>
          <p className="text-sm text-muted mt-1">
            {templates.length} {pluralize(templates.length, "шаблон", "шаблона", "шаблонов")}
            {" · "}
            {submissionsTotal} {pluralize(submissionsTotal, "ссылка отправлена", "ссылки отправлено", "ссылок отправлено")}
            {" · "}
            {submissionsDone} {pluralize(submissionsDone, "ответ получен", "ответа получено", "ответов получено")}
          </p>
        </div>
        <Link
          href="/admin/templates/new"
          className="rounded-xl bg-gradient-to-br from-accent to-accent-deep text-white px-4 py-2 text-sm font-medium shadow-sm hover:brightness-110 transition"
        >
          + Новый шаблон
        </Link>
      </div>

      {templates.length === 0 && (
        <p className="text-muted text-sm">Пока нет ни одного шаблона.</p>
      )}

      <div className="grid gap-4">
        {templates.map((t) => {
          const blocks = JSON.parse(t.blocks) as Block[];
          return (
            <div
              key={t.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-accent/40 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between gap-4">
                <Link href={`/admin/templates/${t.id}`} className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {t.roleLabel}
                  </p>
                  <h2 className="text-lg font-medium text-foreground">{t.name}</h2>
                </Link>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm text-muted">{blocks.length} блок(ов)</span>
                  <DeleteTemplateButton templateId={t.id} templateName={t.name} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

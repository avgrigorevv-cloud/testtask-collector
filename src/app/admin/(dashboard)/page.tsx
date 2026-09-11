import Link from "next/link";
import { Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/lib/blocks";
import { DeleteTemplateButton } from "@/components/admin/DeleteTemplateButton";
import { DuplicateTemplateButton } from "@/components/admin/DuplicateTemplateButton";
import { DropdownMenu } from "@/components/admin/DropdownMenu";

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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Шаблоны заданий</h1>
          <p className="text-sm text-muted mt-2">
            {templates.length} {pluralize(templates.length, "шаблон", "шаблона", "шаблонов")}
            {" · "}
            {submissionsTotal} {pluralize(submissionsTotal, "ссылка отправлена", "ссылки отправлено", "ссылок отправлено")}
            {" · "}
            {submissionsDone} {pluralize(submissionsDone, "ответ получен", "ответа получено", "ответов получено")}
          </p>
        </div>
        <Link
          href="/admin/templates/new"
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_var(--accent-glow)] transition hover:bg-accent-deep"
        >
          + Новый шаблон
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-white px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
            <Layers className="h-5 w-5 text-accent-strong" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Пока нет шаблонов</h2>
          <p className="max-w-sm text-sm text-muted">
            Создайте первый шаблон, чтобы начать собирать отклики на тестовые задания.
          </p>
          <Link
            href="/admin/templates/new"
            className="mt-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_var(--accent-glow)] transition hover:bg-accent-deep"
          >
            + Новый шаблон
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((t) => {
            const blocks = JSON.parse(t.blocks) as Block[];
            return (
              <div
                key={t.id}
                className="group relative rounded-3xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="absolute right-4 top-4">
                  <DropdownMenu>
                    <DuplicateTemplateButton templateId={t.id} />
                    <div className="my-1 border-t border-line" />
                    <DeleteTemplateButton templateId={t.id} templateName={t.name} />
                  </DropdownMenu>
                </div>
                <Link href={`/admin/templates/${t.id}`} className="block pr-8">
                  <p className="text-xs font-medium uppercase tracking-wide text-accent">
                    {t.roleLabel}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">{t.name}</h2>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-strong">
                    <Layers className="h-3.5 w-3.5" />
                    {blocks.length} {pluralize(blocks.length, "блок", "блока", "блоков")}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      )}
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

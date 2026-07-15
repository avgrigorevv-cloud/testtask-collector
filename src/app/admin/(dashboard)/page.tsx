import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/lib/blocks";
import { DeleteTemplateButton } from "@/components/admin/DeleteTemplateButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Шаблоны заданий</h1>
        <Link
          href="/admin/templates/new"
          className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800"
        >
          + Новый шаблон
        </Link>
      </div>

      {templates.length === 0 && (
        <p className="text-slate-500 text-sm">Пока нет ни одного шаблона.</p>
      )}

      <div className="grid gap-4">
        {templates.map((t) => {
          const blocks = JSON.parse(t.blocks) as Block[];
          return (
            <div
              key={t.id}
              className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition"
            >
              <div className="flex items-center justify-between gap-4">
                <Link href={`/admin/templates/${t.id}`} className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {t.roleLabel}
                  </p>
                  <h2 className="text-lg font-medium text-slate-900">{t.name}</h2>
                </Link>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm text-slate-500">{blocks.length} блок(ов)</span>
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

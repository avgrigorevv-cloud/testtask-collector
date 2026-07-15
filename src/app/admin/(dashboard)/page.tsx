import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/lib/blocks";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
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
            <Link
              key={t.id}
              href={`/admin/templates/${t.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {t.roleLabel}
                  </p>
                  <h2 className="text-lg font-medium text-slate-900">{t.name}</h2>
                </div>
                <div className="text-sm text-slate-500 text-right">
                  <p>{blocks.length} блок(ов)</p>
                  <p>{t._count.submissions} прохождени(й)</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

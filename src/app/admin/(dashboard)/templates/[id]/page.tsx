import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/lib/blocks";
import { TemplateBuilder } from "@/components/admin/TemplateBuilder";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) notFound();

  const blocks = JSON.parse(template.blocks) as Block[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Редактирование шаблона</h1>
        <Link
          href={`/admin/templates/${id}/submissions`}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
        >
          Прохождения →
        </Link>
      </div>
      <TemplateBuilder
        initial={{
          id: template.id,
          name: template.name,
          roleLabel: template.roleLabel,
          description: template.description ?? "",
          blocks,
        }}
      />
    </div>
  );
}

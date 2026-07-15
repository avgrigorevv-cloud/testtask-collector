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
    <TemplateBuilder
      title="Редактирование шаблона"
      initial={{
        id: template.id,
        name: template.name,
        roleLabel: template.roleLabel,
        description: template.description ?? "",
        estimatedDuration: template.estimatedDuration ?? "",
        blocks,
      }}
    />
  );
}

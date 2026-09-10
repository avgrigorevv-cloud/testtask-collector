import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/lib/blocks";
import { CandidateFlow } from "@/components/candidate/CandidateFlow";
import { BackLink } from "@/components/admin/BackLink";

export const dynamic = "force-dynamic";

export default async function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) notFound();

  const blocks = JSON.parse(template.blocks) as Block[];

  return (
    <div>
      <div className="pb-4">
        <BackLink href={`/admin/templates/${id}`}>{template.name}</BackLink>
      </div>
      <CandidateFlow
        token=""
        templateName={template.name}
        roleLabel={template.roleLabel}
        description={template.description ?? ""}
        estimatedDuration={template.estimatedDuration ?? ""}
        blocks={blocks}
        initialAnswers={{}}
        initialStatus="pending"
        preview
      />
    </div>
  );
}

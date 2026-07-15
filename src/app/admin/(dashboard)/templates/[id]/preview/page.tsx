import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/lib/blocks";
import { CandidateFlow } from "@/components/candidate/CandidateFlow";

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
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <Link href={`/admin/templates/${id}`} className="text-sm text-slate-500 hover:text-slate-900">
          ← {template.name}
        </Link>
      </div>
      <CandidateFlow
        token=""
        templateName={template.name}
        roleLabel={template.roleLabel}
        description={template.description ?? ""}
        blocks={blocks}
        initialAnswers={{}}
        initialStatus="pending"
        preview
      />
    </div>
  );
}

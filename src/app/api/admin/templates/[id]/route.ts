import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/lib/blocks";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: template.id,
    name: template.name,
    roleLabel: template.roleLabel,
    description: template.description,
    estimatedDuration: template.estimatedDuration,
    blocks: JSON.parse(template.blocks) as Block[],
  });
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const { name, roleLabel, description, estimatedDuration, blocks } = body as {
    name: string;
    roleLabel: string;
    description?: string;
    estimatedDuration?: string;
    blocks: Block[];
  };

  const template = await prisma.template.update({
    where: { id },
    data: {
      name,
      roleLabel,
      description: description ?? "",
      estimatedDuration: estimatedDuration ?? "",
      blocks: JSON.stringify(blocks ?? []),
    },
  });

  return NextResponse.json({ id: template.id });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.template.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

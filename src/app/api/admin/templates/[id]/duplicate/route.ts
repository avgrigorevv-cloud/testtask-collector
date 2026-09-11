import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const copy = await prisma.template.create({
    data: {
      name: `${template.name} (копия)`,
      roleLabel: template.roleLabel,
      description: template.description,
      estimatedDuration: template.estimatedDuration,
      blocks: template.blocks,
    },
  });

  return NextResponse.json({ id: copy.id });
}

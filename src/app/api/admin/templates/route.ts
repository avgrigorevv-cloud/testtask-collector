import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/lib/blocks";

export async function GET() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });

  return NextResponse.json(
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      roleLabel: t.roleLabel,
      description: t.description,
      blockCount: (JSON.parse(t.blocks) as Block[]).length,
      submissionCount: t._count.submissions,
      createdAt: t.createdAt,
    }))
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, roleLabel, description, blocks } = body as {
    name: string;
    roleLabel: string;
    description?: string;
    blocks: Block[];
  };

  if (!name || !roleLabel) {
    return NextResponse.json({ error: "name и roleLabel обязательны" }, { status: 400 });
  }

  const template = await prisma.template.create({
    data: {
      name,
      roleLabel,
      description: description ?? "",
      blocks: JSON.stringify(blocks ?? []),
    },
  });

  return NextResponse.json({ id: template.id });
}

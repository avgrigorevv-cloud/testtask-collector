import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const submissions = await prisma.submission.findMany({
    where: { templateId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(submissions);
}

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;

  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: "template not found" }, { status: 404 });
  }

  const submission = await prisma.submission.create({
    data: { templateId: id },
  });

  return NextResponse.json(submission);
}

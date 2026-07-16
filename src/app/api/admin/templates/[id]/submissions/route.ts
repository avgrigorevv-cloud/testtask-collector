import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { generateToken } from "@/lib/token";

type Params = { params: Promise<{ id: string }> };

const MAX_TOKEN_ATTEMPTS = 5;
const DEFAULT_EXPIRY_DAYS = 30;

async function createSubmissionWithToken(templateId: string) {
  const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt++) {
    try {
      return await prisma.submission.create({
        data: { templateId, token: generateToken(), expiresAt },
      });
    } catch (err) {
      const isTokenCollision =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        (err.meta?.target as string[] | undefined)?.includes("token");
      if (!isTokenCollision) throw err;
    }
  }
  throw new Error("could not generate a unique submission token");
}

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

  const submission = await createSubmissionWithToken(id);

  return NextResponse.json(submission);
}

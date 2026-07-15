import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSafeExternalUrl } from "@/lib/url";
import { isRateLimited } from "@/lib/rateLimit";
import type { Block } from "@/lib/blocks";

type Params = { params: Promise<{ token: string }> };

const KNOWN_TYPES = new Set(["link", "text", "file_upload", "image_annotate"]);
const MAX_VALUE_BYTES = 200_000;

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;

  if (isRateLimited(`answer:${token}`, 120, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { blockId, type, value } = (await request.json()) as {
    blockId: string;
    type: string;
    value: unknown;
  };

  if (!blockId || !type || !KNOWN_TYPES.has(type)) {
    return NextResponse.json({ error: "некорректный запрос" }, { status: 400 });
  }

  if (type === "link") {
    const url = (value as { url?: unknown } | null)?.url;
    if (url && !isSafeExternalUrl(url)) {
      return NextResponse.json({ error: "недопустимая ссылка" }, { status: 400 });
    }
  }

  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_VALUE_BYTES) {
    return NextResponse.json({ error: "ответ слишком большой" }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({
    where: { token },
    include: { template: true },
  });
  if (!submission) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (submission.status === "submitted") {
    return NextResponse.json({ error: "already submitted" }, { status: 403 });
  }

  const templateBlocks = JSON.parse(submission.template.blocks) as Block[];
  const block = templateBlocks.find((b) => b.id === blockId);
  if (!block || block.type !== type) {
    return NextResponse.json({ error: "блок не найден в шаблоне" }, { status: 400 });
  }

  await prisma.answer.upsert({
    where: { submissionId_blockId: { submissionId: submission.id, blockId } },
    update: { value: serialized, type },
    create: {
      submissionId: submission.id,
      blockId,
      type,
      value: serialized,
    },
  });

  return NextResponse.json({ ok: true });
}

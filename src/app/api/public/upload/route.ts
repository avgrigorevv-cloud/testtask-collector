import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveSubmissionUploadedFile, UploadRejectedError } from "@/lib/storage";
import { isRateLimited } from "@/lib/rateLimit";
import { isSubmissionExpired } from "@/lib/submissionExpiry";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const token = formData.get("token");

  if (!(file instanceof File) || typeof token !== "string") {
    return NextResponse.json({ error: "file и token обязательны" }, { status: 400 });
  }

  if (isRateLimited(`upload:${token}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много загрузок, попробуйте позже" },
      { status: 429 }
    );
  }

  const submission = await prisma.submission.findUnique({ where: { token } });
  if (!submission) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (submission.status === "submitted") {
    return NextResponse.json({ error: "already submitted" }, { status: 403 });
  }
  if (isSubmissionExpired(submission.expiresAt)) {
    return NextResponse.json({ error: "ссылка истекла" }, { status: 403 });
  }

  try {
    const saved = await saveSubmissionUploadedFile(file, submission.id);
    return NextResponse.json(saved);
  } catch (e) {
    if (e instanceof UploadRejectedError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

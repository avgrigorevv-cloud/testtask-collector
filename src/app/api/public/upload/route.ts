import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const token = formData.get("token");

  if (!(file instanceof File) || typeof token !== "string") {
    return NextResponse.json({ error: "file и token обязательны" }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({ where: { token } });
  if (!submission) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (submission.status === "submitted") {
    return NextResponse.json({ error: "already submitted" }, { status: 403 });
  }

  const saved = await saveUploadedFile(file, `submissions/${submission.id}`);
  return NextResponse.json(saved);
}

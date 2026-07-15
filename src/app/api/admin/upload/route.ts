import { NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/storage";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }

  const saved = await saveUploadedFile(file, "admin");
  return NextResponse.json(saved);
}

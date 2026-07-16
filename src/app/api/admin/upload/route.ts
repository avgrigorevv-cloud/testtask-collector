import { NextResponse } from "next/server";
import { saveAdminUploadedFile, UploadRejectedError } from "@/lib/storage";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }

  try {
    const saved = await saveAdminUploadedFile(file);
    return NextResponse.json(saved);
  } catch (e) {
    if (e instanceof UploadRejectedError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

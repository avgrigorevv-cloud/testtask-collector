import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE_NAME, isValidAdminToken } from "@/lib/auth";
import { getExtUser } from "@/lib/extAuth";
import { captureFilePath } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

function notFound() {
  return NextResponse.json({ error: "not found" }, { status: 404 });
}

// Serves a capture image. Allowed for the admin session or for the owner's
// extension bearer token; everyone else gets 404 (don't reveal existence).
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const capture = await prisma.capture.findUnique({ where: { id } });
  if (!capture) return notFound();

  const isAdmin = isValidAdminToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!isAdmin) {
    const user = await getExtUser(request);
    if (!user || user.id !== capture.userId) return notFound();
  }

  // ?variant=annotated -> the copy with numbered pins drawn on it (if any)
  const wantAnnotated = request.nextUrl.searchParams.get("variant") === "annotated";
  const file = wantAnnotated && capture.annotatedFile ? capture.annotatedFile : capture.imageFile;

  let buffer: Buffer;
  try {
    buffer = await readFile(captureFilePath(capture.userId, file));
  } catch {
    return notFound();
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  const stamp = capture.createdAt.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const ext = file.endsWith(".jpg") ? ".jpg" : ".png";
  const filename = `capture-${stamp}${file === capture.annotatedFile ? "-pins" : ""}${ext}`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": ext === ".jpg" ? "image/jpeg" : "image/png",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

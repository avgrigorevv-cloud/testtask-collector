import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { EXTENSION_MIME_TYPES, adminFilePath } from "@/lib/storage";

type Params = { params: Promise<{ filename: string }> };

const FILENAME_RE = /^[0-9a-f-]+\.[a-zA-Z0-9]+$/;

function notFound() {
  return NextResponse.json({ error: "not found" }, { status: 404 });
}

// Publicly readable, no auth check — same as admin uploads were when served
// as static files (shown to any candidate holding a template link). Served
// through a route handler instead of public/ so it isn't subject to
// next start's build-time snapshot of public/ (see src/lib/storage.ts).
export async function GET(_request: Request, { params }: Params) {
  const { filename } = await params;

  if (
    !filename ||
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\") ||
    !FILENAME_RE.test(filename)
  ) {
    return notFound();
  }

  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  const mimeType = EXTENSION_MIME_TYPES[ext];
  if (!mimeType) {
    return notFound();
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(adminFilePath(filename));
  } catch {
    return notFound();
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

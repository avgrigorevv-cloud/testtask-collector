import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE_NAME, isValidAdminToken, timingSafeStringEqual } from "@/lib/auth";
import { EXTENSION_MIME_TYPES, submissionFilePath } from "@/lib/storage";

type Params = { params: Promise<{ id: string; filename: string }> };

const FILENAME_RE = /^[0-9a-f-]+\.[a-zA-Z0-9]+$/;

function notFound() {
  return NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id, filename } = await params;

  // Defense in depth: dynamic segments can't normally contain "/" or "..",
  // but validate the expected <uuid>.<ext> shape explicitly anyway.
  if (
    !filename ||
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\") ||
    !FILENAME_RE.test(filename)
  ) {
    return notFound();
  }

  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) {
    return notFound();
  }

  // Read the admin session cookie straight off the request, the same way
  // src/proxy.ts does it — next/headers' cookies() requires an active
  // request-scope (App Router render/action context) that a plain route
  // handler invoked directly (e.g. in tests, or via NextRequest here) does
  // not have.
  const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isAdmin = isValidAdminToken(adminToken);

  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const hasValidToken =
    typeof queryToken === "string" && timingSafeStringEqual(queryToken, submission.token);

  if (!isAdmin && !hasValidToken) {
    return notFound();
  }

  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  const mimeType = EXTENSION_MIME_TYPES[ext];
  if (!mimeType) {
    return notFound();
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(submissionFilePath(id, filename));
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

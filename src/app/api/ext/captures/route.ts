import { NextResponse } from "next/server";
import { extPreflight, withExtCors } from "@/lib/extCors";
import { prisma } from "@/lib/prisma";
import { getExtUser } from "@/lib/extAuth";
import { unlink } from "fs/promises";
import type { Pin } from "@/lib/blocks";
import { captureDayKey, captureFilePath, saveCaptureImage, UploadRejectedError } from "@/lib/storage";
import { MAX_NOTE_LENGTH, MAX_PAGE_URL_LENGTH, optionalInt, optionalText, parsePins } from "@/lib/captures";
import { isRateLimited } from "@/lib/rateLimit";

const MAX_REQUEST_BYTES = 60 * 1024 * 1024;

// Receives a screenshot from the browser extension.
// multipart/form-data: image (PNG), annotated? (PNG with pins drawn), pins (JSON Pin[]), pageUrl, pageTitle?,
// note?, viewportWidth?, viewportHeight?
export const POST = withExtCors(async function postHandler(request: Request) {
  const user = await getExtUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (isRateLimited(`ext-capture:${user.id}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: "Слишком много скриншотов, подождите минуту" }, { status: 429 });
  }

  // Refuse oversized bodies before buffering them in memory (two 25 MB images
  // plus form fields fit comfortably under this).
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Слишком большой запрос" }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const image = formData.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Нет скриншота" }, { status: 400 });
  }

  const annotated = formData.get("annotated");

  const pins = parsePins(formData.get("pins") ?? "[]");
  if (!pins) {
    return NextResponse.json({ error: "Некорректные метки" }, { status: 400 });
  }

  const rawPageUrl = formData.get("pageUrl");
  if (typeof rawPageUrl !== "string" || !rawPageUrl.trim()) {
    return NextResponse.json({ error: "Нет адреса страницы" }, { status: 400 });
  }
  // Long URLs (dashboards, filters) are cut, never rejected.
  const pageUrl = rawPageUrl.trim().slice(0, MAX_PAGE_URL_LENGTH);

  // Files written so far; removed again if the request fails half-way, so no
  // file is left on disk without a database row.
  const written: string[] = [];
  const day = captureDayKey();
  try {
    const imageFile = await saveCaptureImage(image, user.id, day);
    written.push(imageFile);
    let annotatedFile: string | null = null;
    if (annotated instanceof File && annotated.size > 0) {
      annotatedFile = await saveCaptureImage(annotated, user.id, day);
      written.push(annotatedFile);
    }
    const capture = await createCaptureRow(formData, user.id, imageFile, annotatedFile, pageUrl, pins);
    return NextResponse.json({ id: capture.id, createdAt: capture.createdAt });
  } catch (e) {
    await Promise.all(written.map((f) => unlink(captureFilePath(user.id, f)).catch(() => {})));
    if (e instanceof UploadRejectedError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
});

function createCaptureRow(
  formData: FormData,
  userId: string,
  imageFile: string,
  annotatedFile: string | null,
  pageUrl: string,
  pins: Pin[]
) {
  return prisma.capture.create({
    data: {
      userId,
      imageFile,
      annotatedFile,
      pageUrl,
      pageTitle: optionalText(formData.get("pageTitle"), 500),
      note: optionalText(formData.get("note"), MAX_NOTE_LENGTH),
      pins: JSON.stringify(pins),
      viewportWidth: optionalInt(formData.get("viewportWidth")),
      viewportHeight: optionalInt(formData.get("viewportHeight")),
    },
  });
}

export function OPTIONS(request: Request) {
  return extPreflight(request);
}

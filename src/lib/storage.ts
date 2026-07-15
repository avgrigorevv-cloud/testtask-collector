import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

// Deliberately excludes anything a browser would execute or render as active
// content if opened directly (html, svg, js, ...) — uploads are served as
// static files with no control over Content-Type/Content-Disposition, so an
// allowed extension here is effectively "safe to open directly in a browser".
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".zip",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".key",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".mp4",
  ".mov",
  ".webm",
]);

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB

export class UploadRejectedError extends Error {}

export async function saveUploadedFile(file: File, subdir: string) {
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new UploadRejectedError(`Недопустимый тип файла: ${ext || "без расширения"}`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new UploadRejectedError("Файл слишком большой (максимум 25 МБ)");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  const safeName = `${randomUUID()}${ext}`;
  await writeFile(path.join(dir, safeName), buffer);
  return { url: `/uploads/${subdir}/${safeName}`, name: file.name };
}

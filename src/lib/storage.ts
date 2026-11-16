import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Root for everything the app writes to disk at runtime — outside public/ on
// purpose. `next start` only reliably serves public/ content that existed at
// build time; files written into public/ after the server has booted can 404
// even though they exist on disk (confirmed in production — see TECH_DEBT.md
// item #7). Both subdirs below are served through explicit route handlers
// that read from disk on every request instead, sidestepping that entirely.
// public/uploads/seed/ is the only upload-shaped content still under
// public/, since it's committed to the repo and baked into the image at
// build time — genuinely static, not written at runtime.
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

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
  ".csv",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".mp4",
  ".mov",
  ".webm",
]);

// Shared ext -> MIME map used both here (not strictly needed) and by the
// submissions file-serving route handler to set Content-Type explicitly.
export const EXTENSION_MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".key": "application/vnd.apple.keynote",
  ".csv": "text/csv",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB

export class UploadRejectedError extends Error {}

function validateFile(file: File): string {
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new UploadRejectedError(`Недопустимый тип файла: ${ext || "без расширения"}`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new UploadRejectedError("Файл слишком большой (максимум 25 МБ)");
  }
  return ext;
}

// Admin-uploaded content (template hero/background images, task attachments
// etc.) — publicly readable (no auth check in the route handler), but still
// served through src/app/api/files/admin/[filename]/route.ts rather than as
// static files, for the next-start-doesn't-see-new-files reason above.
export async function saveAdminUploadedFile(file: File) {
  const ext = validateFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(UPLOAD_ROOT, "admin");
  await mkdir(dir, { recursive: true });
  const safeName = `${randomUUID()}${ext}`;
  await writeFile(path.join(dir, safeName), buffer);
  return { url: `/api/files/admin/${safeName}`, name: file.name };
}

// Candidate-uploaded answer files — private, written under the non-public
// uploads/submissions/<submissionId>/ root and served only through the
// authorized route handler, never as static files.
export async function saveSubmissionUploadedFile(file: File, submissionId: string) {
  const ext = validateFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(UPLOAD_ROOT, "submissions", submissionId);
  await mkdir(dir, { recursive: true });
  const safeName = `${randomUUID()}${ext}`;
  await writeFile(path.join(dir, safeName), buffer);
  return {
    url: `/api/files/submissions/${submissionId}/${safeName}`,
    name: file.name,
  };
}

export function submissionFilePath(submissionId: string, filename: string): string {
  return path.join(UPLOAD_ROOT, "submissions", submissionId, filename);
}

export function adminFilePath(filename: string): string {
  return path.join(UPLOAD_ROOT, "admin", filename);
}

// Screenshots sent by the browser extension — private, one folder per
// extension login: uploads/captures/<userId>/<YYYY-MM-DD>/<uuid>.png. Served only through
// src/app/api/files/captures/[id]/route.ts (admin session or the owner's
// extension bearer token).
const MAX_CAPTURE_BYTES = 25 * 1024 * 1024; // 25MB, same as other uploads
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

// Local calendar day, used both as the on-disk subfolder and for grouping in
// the admin UI, so the two always agree.
export function captureDayKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Returns the path relative to the user's folder: "<day>/<uuid>.png".
export async function saveCaptureImage(
  file: File,
  userId: string,
  day: string = captureDayKey()
): Promise<string> {
  if (file.size > MAX_CAPTURE_BYTES) {
    throw new UploadRejectedError("Скриншот слишком большой (максимум 25 МБ)");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  // PNG (what chrome.tabs.captureVisibleTab produces) or JPEG (the extension
  // re-encodes very large screenshots). Check magic bytes, not the name/type.
  let ext: ".png" | ".jpg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) ext = ".png";
  else if (buffer.length >= 3 && buffer.subarray(0, 3).equals(JPEG_SIGNATURE)) ext = ".jpg";
  else throw new UploadRejectedError("Скриншот должен быть в формате PNG или JPEG");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("invalid capture day");
  const dir = path.join(UPLOAD_ROOT, "captures", userId, day);
  await mkdir(dir, { recursive: true });
  const safeName = `${randomUUID()}${ext}`;
  await writeFile(path.join(dir, safeName), buffer);
  return `${day}/${safeName}`;
}

export function captureFilePath(userId: string, filename: string): string {
  return path.join(UPLOAD_ROOT, "captures", userId, filename);
}

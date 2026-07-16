import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const PUBLIC_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
// Non-public root: sibling of public/, so Next.js never serves it as static
// content — candidate submission files must only be reachable through the
// authorized route handler in src/app/api/files/submissions/[id]/[filename].
const PRIVATE_UPLOAD_ROOT = path.join(process.cwd(), "uploads");

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

// Admin-uploaded content (template hero/background images etc.) — legitimately
// public, served as static files under /uploads/admin/<file>. Unchanged
// behavior; kept separate from submission uploads below.
export async function saveAdminUploadedFile(file: File) {
  const ext = validateFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(PUBLIC_UPLOAD_ROOT, "admin");
  await mkdir(dir, { recursive: true });
  const safeName = `${randomUUID()}${ext}`;
  await writeFile(path.join(dir, safeName), buffer);
  return { url: `/uploads/admin/${safeName}`, name: file.name };
}

// Candidate-uploaded answer files — private, written under the non-public
// uploads/submissions/<submissionId>/ root and served only through the
// authorized route handler, never as static files.
export async function saveSubmissionUploadedFile(file: File, submissionId: string) {
  const ext = validateFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(PRIVATE_UPLOAD_ROOT, "submissions", submissionId);
  await mkdir(dir, { recursive: true });
  const safeName = `${randomUUID()}${ext}`;
  await writeFile(path.join(dir, safeName), buffer);
  return {
    url: `/api/files/submissions/${submissionId}/${safeName}`,
    name: file.name,
  };
}

export function submissionFilePath(submissionId: string, filename: string): string {
  return path.join(PRIVATE_UPLOAD_ROOT, "submissions", submissionId, filename);
}

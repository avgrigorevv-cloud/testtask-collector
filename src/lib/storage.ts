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

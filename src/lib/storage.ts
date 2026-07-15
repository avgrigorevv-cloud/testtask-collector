import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export async function saveUploadedFile(file: File, subdir: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  const ext = path.extname(file.name);
  const safeName = `${randomUUID()}${ext}`;
  await writeFile(path.join(dir, safeName), buffer);
  return { url: `/uploads/${subdir}/${safeName}`, name: file.name };
}

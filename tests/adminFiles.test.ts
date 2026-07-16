// Regression test for a production incident: next start doesn't reliably
// serve files written into public/ after the server has booted, so
// admin-uploaded task attachments 404'd even though they existed on disk.
// Admin uploads now go through a route handler that reads from disk on
// every request instead of relying on Next's static public/ serving.
import "./setupEnv.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { POST as uploadFile } from "../src/app/api/admin/upload/route.ts";
import { GET as getAdminFile } from "../src/app/api/files/admin/[filename]/route.ts";

test.after(async () => {
  await rm(path.join(process.cwd(), "uploads", "admin"), { recursive: true, force: true });
});

function makeUploadRequest(filename: string) {
  const file = new File([Buffer.from("hello admin")], filename, {
    type: "application/pdf",
  });
  const fd = new FormData();
  fd.append("file", file);
  return new Request("http://localhost/api/admin/upload", { method: "POST", body: fd });
}

test("admin upload returns a url under /api/files/admin/, not /uploads/admin/", async () => {
  const res = await uploadFile(makeUploadRequest("task.pdf"));
  assert.equal(res.status, 200);
  const body = await res.json();

  assert.match(body.url, /^\/api\/files\/admin\//);
  assert.doesNotMatch(body.url, /^\/uploads\/admin\//);
});

test("the admin file route serves the file with no auth required", async () => {
  const uploadRes = await uploadFile(makeUploadRequest("task2.pdf"));
  const { url } = await uploadRes.json();
  const filename = url.split("/").pop();

  const res = await getAdminFile(new Request(`http://localhost${url}`), {
    params: Promise.resolve({ filename }),
  });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/pdf");
  const buf = Buffer.from(await res.arrayBuffer());
  assert.equal(buf.toString(), "hello admin");
});

test("the admin file route 404s for a nonexistent file", async () => {
  const res = await getAdminFile(new Request("http://localhost/api/files/admin/does-not-exist.pdf"), {
    params: Promise.resolve({ filename: "does-not-exist.pdf" }),
  });

  assert.equal(res.status, 404);
});

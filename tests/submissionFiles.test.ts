// Tests for tech-debt item #11: candidate-uploaded submission files must no
// longer be served as public static files under public/uploads/submissions —
// they move to a private uploads/submissions/ root and are only reachable
// through an authorized route handler (admin session cookie or the
// submission's own token).
import "./setupEnv.ts";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.ts";
import { generateToken } from "../src/lib/token.ts";
import { ADMIN_COOKIE_NAME, expectedAdminToken } from "../src/lib/auth.ts";
import { POST as uploadFile } from "../src/app/api/public/upload/route.ts";
import { GET as getSubmissionFile } from "../src/app/api/files/submissions/[id]/[filename]/route.ts";

let templateId: string;

before(async () => {
  const template = await prisma.template.create({
    data: {
      name: `submission files test template ${randomUUID()}`,
      roleLabel: "QA",
      blocks: JSON.stringify([]),
    },
  });
  templateId = template.id;
});

after(async () => {
  await prisma.template.delete({ where: { id: templateId } });
  await rm(path.join(process.cwd(), "uploads", "submissions"), {
    recursive: true,
    force: true,
  });
  await prisma.$disconnect();
});

function makeUploadRequest(token: string, filename: string) {
  const file = new File([Buffer.from("hello world")], filename, {
    type: "application/pdf",
  });
  const fd = new FormData();
  fd.append("file", file);
  fd.append("token", token);
  return new Request("http://localhost/api/public/upload", {
    method: "POST",
    body: fd,
  });
}

async function uploadAndGetUrl(token: string) {
  const res = await uploadFile(makeUploadRequest(token, "answer.pdf"));
  assert.equal(res.status, 200);
  const body = await res.json();
  return body.url as string;
}

test("public upload endpoint returns a url under /api/files/submissions/, not /uploads/submissions/", async () => {
  const submission = await prisma.submission.create({
    data: { templateId, token: generateToken() },
  });

  const url = await uploadAndGetUrl(submission.token);

  assert.match(url, /^\/api\/files\/submissions\//);
  assert.doesNotMatch(url, /^\/uploads\/submissions\//);
});

function parseUrl(url: string) {
  const [, , , , id, filename] = url.split("/");
  return { id, filename };
}

test("file-serving route 404s with no admin cookie and no token", async () => {
  const submission = await prisma.submission.create({
    data: { templateId, token: generateToken() },
  });
  const url = await uploadAndGetUrl(submission.token);
  const { id, filename } = parseUrl(url);

  const res = await getSubmissionFile(
    new NextRequest(`http://localhost${url}`),
    { params: Promise.resolve({ id, filename }) }
  );

  assert.equal(res.status, 404);
});

test("file-serving route 404s with a wrong token", async () => {
  const submission = await prisma.submission.create({
    data: { templateId, token: generateToken() },
  });
  const url = await uploadAndGetUrl(submission.token);
  const { id, filename } = parseUrl(url);

  const res = await getSubmissionFile(
    new NextRequest(`http://localhost${url}?token=not-the-right-token`),
    { params: Promise.resolve({ id, filename }) }
  );

  assert.equal(res.status, 404);
});

test("file-serving route accepts the correct submission token as ?token=", async () => {
  const submission = await prisma.submission.create({
    data: { templateId, token: generateToken() },
  });
  const url = await uploadAndGetUrl(submission.token);
  const { id, filename } = parseUrl(url);

  const res = await getSubmissionFile(
    new NextRequest(`http://localhost${url}?token=${submission.token}`),
    { params: Promise.resolve({ id, filename }) }
  );

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/pdf");
  assert.equal(res.headers.get("Content-Disposition"), "inline");
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
  const buf = Buffer.from(await res.arrayBuffer());
  assert.equal(buf.toString(), "hello world");
});

test("file-serving route accepts a valid admin session cookie", async () => {
  const submission = await prisma.submission.create({
    data: { templateId, token: generateToken() },
  });
  const url = await uploadAndGetUrl(submission.token);
  const { id, filename } = parseUrl(url);

  const request = new NextRequest(`http://localhost${url}`, {
    headers: { cookie: `${ADMIN_COOKIE_NAME}=${expectedAdminToken()}` },
  });

  const res = await getSubmissionFile(request, {
    params: Promise.resolve({ id, filename }),
  });

  assert.equal(res.status, 200);
});

import "./setupEnv.ts";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma.ts";
import { generateToken } from "../src/lib/token.ts";
import CandidatePage from "../src/app/t/[token]/page.tsx";
import { POST as openSubmission } from "../src/app/api/public/submissions/[token]/open/route.ts";

let templateId: string;

before(async () => {
  const template = await prisma.template.create({
    data: {
      name: `openedAt test template ${randomUUID()}`,
      roleLabel: "QA",
      blocks: JSON.stringify([]),
    },
  });
  templateId = template.id;
});

after(async () => {
  await prisma.template.delete({ where: { id: templateId } });
  await prisma.$disconnect();
});

function openRequest(token: string) {
  return openSubmission(
    new Request(`http://localhost/api/public/submissions/${token}/open`, {
      method: "POST",
    }),
    { params: Promise.resolve({ token }) }
  );
}

test("GET /t/<token> does not itself mark the submission opened", async () => {
  const submission = await prisma.submission.create({
    data: { templateId, token: generateToken() },
  });

  // Rendering the page must stay read-only — link-preview bots fetch this
  // for OG tags and must not fire the side effect (see the /open route).
  await CandidatePage({ params: Promise.resolve({ token: submission.token }) });

  const after1 = await prisma.submission.findUniqueOrThrow({ where: { id: submission.id } });
  assert.equal(after1.status, "pending");
  assert.equal(after1.openedAt, null);
});

test("POST /open sets status to 'opened' and stamps openedAt", async () => {
  const submission = await prisma.submission.create({
    data: { templateId, token: generateToken() },
  });
  assert.equal(submission.status, "pending");
  assert.equal(submission.openedAt, null);

  const res = await openRequest(submission.token);
  assert.equal(res.status, 200);

  const after1 = await prisma.submission.findUniqueOrThrow({ where: { id: submission.id } });
  assert.equal(after1.status, "opened");
  assert.ok(after1.openedAt instanceof Date);
});

test("second POST /open does not move openedAt", async () => {
  const submission = await prisma.submission.create({
    data: { templateId, token: generateToken() },
  });

  await openRequest(submission.token);
  const firstOpen = await prisma.submission.findUniqueOrThrow({ where: { id: submission.id } });

  await openRequest(submission.token);
  const secondOpen = await prisma.submission.findUniqueOrThrow({ where: { id: submission.id } });

  assert.equal(secondOpen.openedAt?.getTime(), firstOpen.openedAt?.getTime());
  assert.equal(secondOpen.status, "opened");
});

test("POST /open on an already-submitted submission does not downgrade its status", async () => {
  const submission = await prisma.submission.create({
    data: {
      templateId,
      token: generateToken(),
      status: "submitted",
      submittedAt: new Date(),
      openedAt: new Date(),
    },
  });

  await openRequest(submission.token);

  const stored = await prisma.submission.findUniqueOrThrow({ where: { id: submission.id } });
  assert.equal(stored.status, "submitted");
});

test("POST /open 404s for an unknown token", async () => {
  const res = await openRequest("does-not-exist");
  assert.equal(res.status, 404);
});

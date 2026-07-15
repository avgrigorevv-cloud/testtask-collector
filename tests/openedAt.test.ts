import "./setupEnv.ts";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma.ts";
import CandidatePage from "../src/app/t/[token]/page.tsx";

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

test("first GET sets status to 'opened' and stamps openedAt", async () => {
  const submission = await prisma.submission.create({ data: { templateId } });
  assert.equal(submission.status, "pending");
  assert.equal(submission.openedAt, null);

  await CandidatePage({ params: Promise.resolve({ token: submission.token }) });

  const after1 = await prisma.submission.findUniqueOrThrow({ where: { id: submission.id } });
  assert.equal(after1.status, "opened");
  assert.ok(after1.openedAt instanceof Date);
});

test("second GET does not move openedAt", async () => {
  const submission = await prisma.submission.create({ data: { templateId } });

  await CandidatePage({ params: Promise.resolve({ token: submission.token }) });
  const firstOpen = await prisma.submission.findUniqueOrThrow({ where: { id: submission.id } });

  await CandidatePage({ params: Promise.resolve({ token: submission.token }) });
  const secondOpen = await prisma.submission.findUniqueOrThrow({ where: { id: submission.id } });

  assert.equal(secondOpen.openedAt?.getTime(), firstOpen.openedAt?.getTime());
  assert.equal(secondOpen.status, "opened");
});

test("GET on an already-submitted submission does not downgrade its status", async () => {
  const submission = await prisma.submission.create({
    data: { templateId, status: "submitted", submittedAt: new Date(), openedAt: new Date() },
  });

  await CandidatePage({ params: Promise.resolve({ token: submission.token }) });

  const stored = await prisma.submission.findUniqueOrThrow({ where: { id: submission.id } });
  assert.equal(stored.status, "submitted");
});

// Tests for tech-debt item #8: submission links expire after
// DEFAULT_EXPIRY_DAYS, both in the candidate-facing page and across the
// answer/upload/submit endpoints (server-side enforcement, not just UI).
import "./setupEnv.ts";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma.ts";
import { generateToken } from "../src/lib/token.ts";
import { POST as createSubmission } from "../src/app/api/admin/templates/[id]/submissions/route.ts";
import { POST as saveAnswer } from "../src/app/api/public/submissions/[token]/answers/route.ts";
import { POST as submitSubmission } from "../src/app/api/public/submissions/[token]/submit/route.ts";
import CandidatePage from "../src/app/t/[token]/page.tsx";
import { CandidateFlow } from "../src/components/candidate/CandidateFlow.tsx";

const textBlockId = randomUUID();

let templateId: string;

before(async () => {
  const template = await prisma.template.create({
    data: {
      name: `expiry test template ${randomUUID()}`,
      roleLabel: "QA",
      blocks: JSON.stringify([
        { id: textBlockId, type: "text", title: "Комментарий", required: false, config: {} },
      ]),
    },
  });
  templateId = template.id;
});

after(async () => {
  await prisma.template.delete({ where: { id: templateId } });
  await prisma.$disconnect();
});

async function createExpiredSubmission(status = "pending") {
  return prisma.submission.create({
    data: {
      templateId,
      token: generateToken(),
      status,
      expiresAt: new Date(Date.now() - 1000),
      ...(status === "submitted" ? { submittedAt: new Date() } : {}),
    },
  });
}

test("admin-created submissions get an expiresAt roughly 30 days out", async () => {
  const res = await createSubmission(
    new Request("http://localhost/api/admin/templates/x/submissions", {
      method: "POST",
    }),
    { params: Promise.resolve({ id: templateId }) }
  );
  assert.equal(res.status, 200);
  const body = await res.json();

  assert.ok(body.expiresAt);
  const days = (new Date(body.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  assert.ok(days > 29 && days < 31, `expected ~30 days out, got ${days}`);

  const stored = await prisma.submission.findUniqueOrThrow({ where: { id: body.id } });
  assert.ok(stored.expiresAt instanceof Date, "expiresAt must round-trip through the DB");
  assert.equal(stored.expiresAt?.toISOString(), body.expiresAt);
});

test("CandidatePage shows the expired screen for a pending expired submission", async () => {
  const submission = await createExpiredSubmission("pending");

  const element = await CandidatePage({
    params: Promise.resolve({ token: submission.token }),
  });

  assert.notEqual(element.type, CandidateFlow);
});

test("CandidatePage still renders the flow for an expired but already-submitted submission", async () => {
  const submission = await createExpiredSubmission("submitted");

  const element = await CandidatePage({
    params: Promise.resolve({ token: submission.token }),
  });

  assert.equal(element.type, CandidateFlow);
  assert.equal(element.props.initialStatus, "submitted");
});

test("saving an answer on an expired submission is rejected", async () => {
  const submission = await createExpiredSubmission("pending");

  const res = await saveAnswer(
    new Request(`http://localhost/api/public/submissions/${submission.token}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId: "x", type: "text", value: { text: "late" } }),
    }),
    { params: Promise.resolve({ token: submission.token }) }
  );

  assert.equal(res.status, 403);
});

test("saving an answer on a non-expired submission succeeds", async () => {
  const submission = await prisma.submission.create({
    data: {
      templateId,
      token: generateToken(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const res = await saveAnswer(
    new Request(`http://localhost/api/public/submissions/${submission.token}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId: textBlockId, type: "text", value: { text: "on time" } }),
    }),
    { params: Promise.resolve({ token: submission.token }) }
  );

  assert.equal(res.status, 200);
});

test("submitting an expired submission is rejected", async () => {
  const submission = await createExpiredSubmission("pending");

  const res = await submitSubmission(
    new Request(`http://localhost/api/public/submissions/${submission.token}/submit`, {
      method: "POST",
    }),
    { params: Promise.resolve({ token: submission.token }) }
  );

  assert.equal(res.status, 403);
});

// Characterization tests: pin down existing behavior BEFORE the token/openedAt/
// candidateName/headers changes land, so an accidental regression in something
// we did not mean to touch fails loudly here.
import "./setupEnv.ts";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma.ts";
import type { Block } from "../src/lib/blocks.ts";
import { POST as createSubmission } from "../src/app/api/admin/templates/[id]/submissions/route.ts";
import { POST as saveAnswer } from "../src/app/api/public/submissions/[token]/answers/route.ts";
import CandidatePage from "../src/app/t/[token]/page.tsx";
import { CandidateFlow } from "../src/components/candidate/CandidateFlow.tsx";

const textBlock: Block = {
  id: randomUUID(),
  type: "text",
  title: "Комментарий",
  required: false,
  config: { multiline: true },
};

let templateId: string;
let templateName: string;

before(async () => {
  templateName = `Char test template ${randomUUID()}`;
  const template = await prisma.template.create({
    data: {
      name: templateName,
      roleLabel: "QA",
      blocks: JSON.stringify([textBlock]),
    },
  });
  templateId = template.id;
});

after(async () => {
  await prisma.template.delete({ where: { id: templateId } });
  await prisma.$disconnect();
});

test("GET /t/<token> serves the task for a valid token", async () => {
  const submission = await prisma.submission.create({ data: { templateId } });

  const element = await CandidatePage({
    params: Promise.resolve({ token: submission.token }),
  });

  assert.equal(element.type, CandidateFlow);
  assert.equal(element.props.token, submission.token);
  assert.equal(element.props.templateName, templateName);
  assert.deepEqual(element.props.blocks, [textBlock]);
  assert.equal(element.props.initialStatus, "pending");
});

test("GET /t/<token> 404s for an unknown token", async () => {
  await assert.rejects(() =>
    CandidatePage({ params: Promise.resolve({ token: "does-not-exist" }) })
  );
});

test("admin creates a Submission for a template", async () => {
  const res = await createSubmission(
    new Request("http://localhost/api/admin/templates/x/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
    { params: Promise.resolve({ id: templateId }) }
  );

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.templateId, templateId);
  assert.ok(body.token);

  const stored = await prisma.submission.findUnique({ where: { id: body.id } });
  assert.ok(stored);
  assert.equal(stored?.templateId, templateId);
});

test("submitted answers are saved and upserted by blockId", async () => {
  const submission = await prisma.submission.create({ data: { templateId } });

  const first = await saveAnswer(
    new Request(`http://localhost/api/public/submissions/${submission.token}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId: textBlock.id, type: "text", value: { text: "first" } }),
    }),
    { params: Promise.resolve({ token: submission.token }) }
  );
  assert.equal(first.status, 200);

  let stored = await prisma.answer.findUnique({
    where: { submissionId_blockId: { submissionId: submission.id, blockId: textBlock.id } },
  });
  assert.equal(JSON.parse(stored!.value).text, "first");

  const second = await saveAnswer(
    new Request(`http://localhost/api/public/submissions/${submission.token}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId: textBlock.id, type: "text", value: { text: "second" } }),
    }),
    { params: Promise.resolve({ token: submission.token }) }
  );
  assert.equal(second.status, 200);

  stored = await prisma.answer.findUnique({
    where: { submissionId_blockId: { submissionId: submission.id, blockId: textBlock.id } },
  });
  assert.equal(JSON.parse(stored!.value).text, "second");

  const count = await prisma.answer.count({ where: { submissionId: submission.id } });
  assert.equal(count, 1, "same blockId must upsert, not duplicate");
});

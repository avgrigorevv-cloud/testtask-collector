// Browser extension API: login per extension user, captures go to the
// user's own folder, images are served only to the admin or the owner.
import "./setupEnv.ts";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.ts";
import { ADMIN_COOKIE_NAME, expectedAdminToken } from "../src/lib/auth.ts";
import { hashPassword } from "../src/lib/extAuth.ts";
import { POST as login } from "../src/app/api/ext/login/route.ts";
import { GET as me } from "../src/app/api/ext/me/route.ts";
import { POST as logout } from "../src/app/api/ext/logout/route.ts";
import { POST as createCapture } from "../src/app/api/ext/captures/route.ts";
import { GET as getCaptureFile } from "../src/app/api/files/captures/[id]/route.ts";
import { POST as createExtUser } from "../src/app/api/admin/ext-users/route.ts";
import { PATCH as changePassword } from "../src/app/api/admin/ext-users/[id]/route.ts";

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const suffix = randomUUID().slice(0, 8);
const aliceLogin = `alice-${suffix}`;
const bobLogin = `bob-${suffix}`;
const PASSWORD = "correct-horse-1";
const userIds: string[] = [];

before(async () => {
  for (const l of [aliceLogin, bobLogin]) {
    const u = await prisma.extUser.create({
      data: { login: l, passwordHash: await hashPassword(PASSWORD) },
    });
    userIds.push(u.id);
  }
});

after(async () => {
  await prisma.extUser.deleteMany({ where: { id: { in: userIds } } });
  for (const id of userIds) {
    await rm(path.join(process.cwd(), "uploads", "captures", id), { recursive: true, force: true });
  }
  await prisma.$disconnect();
});

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 200)}`, ...headers },
    body: JSON.stringify(body),
  });
}

async function loginAs(l: string, password = PASSWORD) {
  return login(jsonRequest("http://localhost/api/ext/login", { login: l, password }));
}

async function tokenFor(l: string) {
  const res = await loginAs(l);
  assert.equal(res.status, 200);
  return (await res.json()).token as string;
}

function captureRequest(token: string | null, overrides: Record<string, string | Blob> = {}) {
  const fd = new FormData();
  fd.append("image", new File([PNG_1PX], "capture.png", { type: "image/png" }));
  fd.append("pins", JSON.stringify([{ imageIndex: 0, x: 10, y: 20, comment: "кнопка" }]));
  fd.append("pageUrl", "https://example.com/page");
  fd.append("pageTitle", "Example");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return new Request("http://localhost/api/ext/captures", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
}

test("login: wrong password and unknown login give the same 401", async () => {
  const wrong = await loginAs(aliceLogin, "nope-nope-nope");
  const unknown = await loginAs(`ghost-${suffix}`);
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(await wrong.json(), await unknown.json());
});

test("login is case-insensitive and returns a working bearer token", async () => {
  const res = await loginAs(aliceLogin.toUpperCase());
  assert.equal(res.status, 200);
  const { token, login: returned } = await res.json();
  assert.equal(returned, aliceLogin);
  const meRes = await me(new Request("http://localhost/api/ext/me", { headers: { Authorization: `Bearer ${token}` } }));
  assert.equal(meRes.status, 200);
  assert.equal((await meRes.json()).login, aliceLogin);
});

test("captures require a bearer token", async () => {
  const res = await createCapture(captureRequest(null));
  assert.equal(res.status, 401);
});

test("capture is saved into the user's folder with pins and page info", async () => {
  const token = await tokenFor(aliceLogin);
  const res = await createCapture(
    captureRequest(token, { annotated: new File([PNG_1PX], "a.png", { type: "image/png" }) })
  );
  assert.equal(res.status, 200);
  const { id } = await res.json();
  const capture = await prisma.capture.findUniqueOrThrow({ where: { id } });
  assert.equal(capture.userId, userIds[0]);
  assert.equal(capture.pageUrl, "https://example.com/page");
  assert.ok(capture.annotatedFile);
  assert.deepEqual(JSON.parse(capture.pins), [{ imageIndex: 0, x: 10, y: 20, comment: "кнопка" }]);
});

test("non-PNG upload and malformed pins are rejected", async () => {
  const token = await tokenFor(aliceLogin);
  const notPng = await createCapture(
    captureRequest(token, { image: new File([Buffer.from("<svg/>")], "x.png", { type: "image/png" }) })
  );
  assert.equal(notPng.status, 400);
  const badPins = await createCapture(captureRequest(token, { pins: JSON.stringify([{ x: 500, y: 1 }]) }));
  assert.equal(badPins.status, 400);
});

test("capture image: owner and admin can read, other user gets 404", async () => {
  const aliceToken = await tokenFor(aliceLogin);
  const bobToken = await tokenFor(bobLogin);
  const { id } = await (await createCapture(captureRequest(aliceToken))).json();
  const url = `http://localhost/api/files/captures/${id}`;
  const params = { params: Promise.resolve({ id }) };

  const asOwner = await getCaptureFile(new NextRequest(url, { headers: { Authorization: `Bearer ${aliceToken}` } }), params);
  assert.equal(asOwner.status, 200);
  assert.equal(asOwner.headers.get("Content-Type"), "image/png");

  const asBob = await getCaptureFile(new NextRequest(url, { headers: { Authorization: `Bearer ${bobToken}` } }), { params: Promise.resolve({ id }) });
  assert.equal(asBob.status, 404);

  const anon = await getCaptureFile(new NextRequest(url), { params: Promise.resolve({ id }) });
  assert.equal(anon.status, 404);

  const asAdmin = await getCaptureFile(
    new NextRequest(url, { headers: { Cookie: `${ADMIN_COOKIE_NAME}=${expectedAdminToken()}` } }),
    { params: Promise.resolve({ id }) }
  );
  assert.equal(asAdmin.status, 200);
});

test("logout revokes the token", async () => {
  const token = await tokenFor(bobLogin);
  await logout(new Request("http://localhost/api/ext/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }));
  const res = await createCapture(captureRequest(token));
  assert.equal(res.status, 401);
});

test("admin: create login validates input and rejects duplicates", async () => {
  const bad = await createExtUser(jsonRequest("http://localhost/api/admin/ext-users", { login: "a", password: "short" }));
  assert.equal(bad.status, 400);
  const dup = await createExtUser(jsonRequest("http://localhost/api/admin/ext-users", { login: aliceLogin, password: PASSWORD }));
  assert.equal(dup.status, 409);
  const newLogin = `carol-${suffix}`;
  const ok = await createExtUser(jsonRequest("http://localhost/api/admin/ext-users", { login: newLogin, password: PASSWORD }));
  assert.equal(ok.status, 200);
  userIds.push((await ok.json()).id);
});

test("admin: password change revokes existing sessions", async () => {
  const token = await tokenFor(aliceLogin);
  const res = await changePassword(
    new Request(`http://localhost/api/admin/ext-users/${userIds[0]}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "another-pass-2" }),
    }),
    { params: Promise.resolve({ id: userIds[0] }) }
  );
  assert.equal(res.status, 200);
  const after = await createCapture(captureRequest(token));
  assert.equal(after.status, 401);
  assert.equal((await loginAs(aliceLogin, "another-pass-2")).status, 200);
});

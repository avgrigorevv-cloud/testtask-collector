import "./setupEnv.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy.ts";

test("/t/<token> responses set Referrer-Policy and X-Robots-Tag", () => {
  const request = new NextRequest("http://localhost/t/some-token");
  const response = proxy(request);

  assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
});

test("other paths are not tagged with the /t/* headers", () => {
  const request = new NextRequest("http://localhost/");
  const response = proxy(request);

  assert.equal(response.headers.get("Referrer-Policy"), null);
  assert.equal(response.headers.get("X-Robots-Tag"), null);
});

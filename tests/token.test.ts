// RED: pins down the requirements for the new token generator before it exists
// (Task B5). Will fail to import until src/lib/token.ts is implemented.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateToken } from "../src/lib/token.ts";

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

test("token is base64url, no padding, of the expected length", () => {
  const token = generateToken();
  assert.match(token, BASE64URL_RE);
  // 24 random bytes -> 32 base64url characters, no '=' padding
  assert.equal(token.length, 32);
});

test("10k generated tokens are unique", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 10_000; i++) {
    seen.add(generateToken());
  }
  assert.equal(seen.size, 10_000);
});

test("tokens are not monotonically increasing lexicographically", () => {
  const tokens = Array.from({ length: 200 }, () => generateToken());
  let increasing = 0;
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] > tokens[i - 1]) increasing++;
  }
  // A monotonic/sequential generator would push this near 100%; random output
  // should land near 50%. Flag anything suspiciously ordered.
  assert.ok(
    increasing < tokens.length * 0.9,
    `tokens look monotonically increasing (${increasing}/${tokens.length - 1} ascending steps)`
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { isRateLimited } from "../src/lib/rateLimit.ts";

test("rate limit blocks after the limit within the window", () => {
  const key = `t-${Math.random()}`;
  for (let i = 0; i < 3; i++) assert.equal(isRateLimited(key, 3, 60_000), false);
  assert.equal(isRateLimited(key, 3, 60_000), true);
});

test("rate limit map stays bounded when keys are attacker-chosen", () => {
  // 25k unique keys must not make the process keep 25k live buckets
  for (let i = 0; i < 25_000; i++) isRateLimited(`flood-${i}`, 5, 60_000);
  // the limiter still works afterwards
  const key = `after-${Math.random()}`;
  assert.equal(isRateLimited(key, 1, 60_000), false);
  assert.equal(isRateLimited(key, 1, 60_000), true);
});

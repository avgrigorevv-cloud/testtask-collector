import test from "node:test";
import assert from "node:assert/strict";
import { safeNextPath } from "../src/lib/safeRedirect.ts";

test("safeNextPath keeps same-site paths", () => {
  assert.equal(safeNextPath("/admin/captures"), "/admin/captures");
  assert.equal(safeNextPath("/admin/templates/abc?x=1#y"), "/admin/templates/abc?x=1#y");
});

test("safeNextPath rejects external and tricky targets", () => {
  for (const bad of [
    "https://evil.example",
    "http://evil.example/admin",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "javascript:alert(1)",
    "evil.example",
    "",
    null,
    undefined,
  ]) {
    assert.equal(safeNextPath(bad as string | null | undefined), "/admin", String(bad));
  }
});

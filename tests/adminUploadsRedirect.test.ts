// Backward-compat regression test: templates created before admin uploads
// moved off public/uploads/admin/ have the old URL shape baked into their
// stored blocks JSON. Those links must keep working via a redirect.
import "./setupEnv.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { GET as legacyRedirect } from "../src/app/uploads/admin/[filename]/route.ts";

test("old /uploads/admin/<file> URLs redirect to the new route handler", async () => {
  const res = await legacyRedirect(
    new Request("http://localhost/uploads/admin/some-uuid.pdf"),
    { params: Promise.resolve({ filename: "some-uuid.pdf" }) }
  );

  assert.equal(res.status, 308);
  assert.equal(res.headers.get("location"), "http://localhost/api/files/admin/some-uuid.pdf");
});

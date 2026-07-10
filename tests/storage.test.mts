import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Unconfigured-mode behavior: make sure no Supabase env leaks in BEFORE import
// (the module reads env at import time).
for (const k of [
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]) {
  delete process.env[k];
}

const { isStorageConfigured, uploadImage, MEDIA_BUCKET } = await import("../src/lib/storage");

describe("storage (unconfigured)", () => {
  it("reports unconfigured without env vars", () => {
    assert.equal(isStorageConfigured(), false);
  });
  it("exports the bucket name", () => {
    assert.equal(MEDIA_BUCKET, "event-media");
  });
  it("uploadImage degrades gracefully with a clear error", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "logo.png", { type: "image/png" });
    const res = await uploadImage(file, "events/test/logo");
    assert.equal(res.ok, false);
    assert.match(res.error!, /not configured/i);
  });
});

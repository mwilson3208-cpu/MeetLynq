import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Configured-mode validation branches. A fake URL/key is enough: the Supabase
// client is only constructed, never called, because validation rejects the
// files before any network request.
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-fake";

const { isStorageConfigured, uploadImage } = await import("../src/lib/storage");

describe("storage (configured — validation branches)", () => {
  it("reports configured", () => {
    assert.equal(isStorageConfigured(), true);
  });
  it("rejects unsupported file types before uploading", async () => {
    const file = new File([new Uint8Array([1])], "evil.exe", { type: "application/octet-stream" });
    const res = await uploadImage(file, "events/x");
    assert.equal(res.ok, false);
    assert.match(res.error!, /unsupported file type/i);
  });
  it("rejects files over 5 MB before uploading", async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    const res = await uploadImage(big, "events/x");
    assert.equal(res.ok, false);
    assert.match(res.error!, /too large/i);
  });
});

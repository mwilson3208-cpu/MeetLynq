import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

// Verify sessions fail closed in production without a real AUTH_SECRET, rather
// than silently signing with the public default (which would be forgeable).
// Env is set BEFORE importing the module (it reads NODE_ENV at call time, but
// we pin it here for the whole file — each test file is its own process).
const prevEnv = process.env.NODE_ENV;
process.env.NODE_ENV = "production";
delete process.env.AUTH_SECRET;

const jar = new Map<string, string>();
mock.module("next/headers", {
  namedExports: {
    cookies: async () => ({
      get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n)! } : undefined),
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      set: (n: string, v: string) => void jar.set(n, v),
      delete: (n: string) => void jar.delete(n),
    }),
  },
});

const { createSession, getCurrentUser } = await import("../src/lib/auth");

describe("auth secret fail-closed (production, no AUTH_SECRET)", () => {
  it("createSession refuses to sign with the default secret", async () => {
    await assert.rejects(() => createSession("user-1"), /AUTH_SECRET is not configured/);
  });

  it("getCurrentUser refuses to verify a forged default-signed cookie", async () => {
    // An attacker-forged cookie signed with the public default must not verify.
    jar.set("meetlynq_session", "user-1.forged");
    await assert.rejects(() => getCurrentUser(), /AUTH_SECRET is not configured/);
  });

  it("a real AUTH_SECRET restores normal signing", async () => {
    process.env.AUTH_SECRET = "a-genuinely-strong-secret-value";
    await createSession("user-42");
    const cookie = jar.get("meetlynq_session");
    assert.ok(cookie?.startsWith("user-42."), "cookie signed with the real secret");
    delete process.env.AUTH_SECRET;
  });
});

process.on("exit", () => {
  process.env.NODE_ENV = prevEnv;
});

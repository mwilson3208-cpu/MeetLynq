import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

// Verify the production auth-secret hardening: when AUTH_SECRET is not set, the
// app must (a) still work — never crash — and (b) NOT sign or accept sessions
// keyed on the public default constant (which anyone could forge). Env is set
// before importing the module; each test file is its own process.
const prevEnv = process.env.NODE_ENV;
process.env.NODE_ENV = "production";
delete process.env.AUTH_SECRET;
// A fixed DB URL makes the derived-secret path deterministic and hermetic
// (these tests never actually open a DB connection).
process.env.DATABASE_URL = "postgresql://user:pw@db.example.com:6543/postgres";

const DEFAULT_SECRET = "dev-meetlynq-secret-change-me";
const defaultSig = (v: string) => `${v}.${createHmac("sha256", DEFAULT_SECRET).update(v).digest("hex")}`;

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

describe("auth secret hardening (production, no AUTH_SECRET)", () => {
  it("createSession signs without throwing, and NOT with the public default", async () => {
    await createSession("user-1");
    const cookie = jar.get("meetlynq_session");
    assert.ok(cookie?.startsWith("user-1."), "a session cookie is issued");
    assert.notEqual(cookie, defaultSig("user-1"), "must not be signed with the public default secret");
  });

  it("rejects a cookie forged with the public default secret (returns null, no throw)", async () => {
    // unsign() computes the expected MAC with the derived secret; the forged
    // default-secret MAC won't match, so getCurrentUser returns null before any
    // DB lookup — proving the public constant can't forge a session.
    jar.set("meetlynq_session", defaultSig("user-1"));
    assert.equal(await getCurrentUser(), null);
  });

  it("returns null (not a crash) for a malformed cookie", async () => {
    jar.set("meetlynq_session", "no-signature-here");
    assert.equal(await getCurrentUser(), null);
  });

  it("prefers an explicit AUTH_SECRET when provided", async () => {
    process.env.AUTH_SECRET = "a-genuinely-strong-secret-value";
    jar.clear();
    await createSession("user-42");
    const cookie = jar.get("meetlynq_session");
    assert.ok(cookie?.startsWith("user-42."), "cookie signed with the real secret");
    assert.notEqual(cookie, defaultSig("user-42"));
    delete process.env.AUTH_SECRET;
  });
});

process.on("exit", () => {
  process.env.NODE_ENV = prevEnv;
});

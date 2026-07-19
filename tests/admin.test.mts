import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { adminEmails, isAdminEmail, isAdminUser } from "../src/lib/admin";

const savedEnv = process.env.ADMIN_EMAILS;
after(() => {
  if (savedEnv === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = savedEnv;
});

describe("adminEmails", () => {
  it("always contains the built-in platform owner", () => {
    delete process.env.ADMIN_EMAILS;
    assert.ok(adminEmails().includes("success@entrepreneurpowernetwork.com"));
  });
  it("merges the ADMIN_EMAILS env var, trimmed and lowercased", () => {
    process.env.ADMIN_EMAILS = " Extra@Example.com , second@example.com ,";
    const list = adminEmails();
    assert.ok(list.includes("extra@example.com"));
    assert.ok(list.includes("second@example.com"));
    delete process.env.ADMIN_EMAILS;
  });
});

describe("isAdminEmail", () => {
  it("matches case-insensitively with whitespace tolerance", () => {
    assert.equal(isAdminEmail("SUCCESS@EntrepreneurPowerNetwork.com"), true);
    assert.equal(isAdminEmail("  success@entrepreneurpowernetwork.com  "), true);
  });
  it("rejects non-admin, empty, and null emails", () => {
    assert.equal(isAdminEmail("organizer@meetlynq.com"), false);
    assert.equal(isAdminEmail(""), false);
    assert.equal(isAdminEmail(null), false);
    assert.equal(isAdminEmail(undefined), false);
  });
});

describe("isAdminUser", () => {
  it("accepts PLATFORM_ADMIN role regardless of email", () => {
    assert.equal(isAdminUser({ role: "PLATFORM_ADMIN", email: "anyone@example.com" }), true);
  });
  it("accepts an allowlisted email regardless of role", () => {
    assert.equal(isAdminUser({ role: "ORGANIZER", email: "success@entrepreneurpowernetwork.com" }), true);
  });
  it("rejects ordinary users and null", () => {
    assert.equal(isAdminUser({ role: "ORGANIZER", email: "organizer@meetlynq.com" }), false);
    assert.equal(isAdminUser(null), false);
  });
});

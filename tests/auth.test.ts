import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/lib/auth";

describe("hashPassword", () => {
  it("produces salt:hash hex format", () => {
    const stored = hashPassword("secret123");
    assert.match(stored, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });
  it("salts uniquely — same password hashes differently", () => {
    assert.notEqual(hashPassword("same"), hashPassword("same"));
  });
  it("hashes an empty password without throwing", () => {
    assert.match(hashPassword(""), /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });
});

describe("verifyPassword", () => {
  it("accepts the correct password", () => {
    assert.equal(verifyPassword("hunter2", hashPassword("hunter2")), true);
  });
  it("rejects a wrong password", () => {
    assert.equal(verifyPassword("wrong", hashPassword("hunter2")), false);
  });
  it("is case-sensitive", () => {
    assert.equal(verifyPassword("Hunter2", hashPassword("hunter2")), false);
  });
  it("round-trips unicode passwords", () => {
    const pw = "pässwörd-日本語-🔒";
    assert.equal(verifyPassword(pw, hashPassword(pw)), true);
  });
  it("round-trips an empty password", () => {
    assert.equal(verifyPassword("", hashPassword("")), true);
  });
  it("rejects malformed stored values without throwing", () => {
    assert.equal(verifyPassword("x", ""), false);
    assert.equal(verifyPassword("x", "no-colon"), false);
    assert.equal(verifyPassword("x", "salt-only:"), false);
    assert.equal(verifyPassword("x", ":hash-only"), false);
    assert.equal(verifyPassword("x", "salt:zznothex"), false);
  });
});

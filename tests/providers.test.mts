import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

// Non-mock provider branches, exercised by setting env BEFORE import.
// (Each test file runs in its own process, so this can't leak elsewhere.)
process.env.EMAIL_PROVIDER = "resend";
process.env.STRIPE_SECRET_KEY = "sk_test_fake_key_for_construction_only";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_fake";

const { sendEmail } = await import("../src/lib/email");
const { isStripeConfigured, getStripe, constructWebhookEvent } = await import("../src/lib/stripe");

describe("email (non-mock provider branch)", () => {
  it("reports the configured provider without sending in mock-less mode", async () => {
    const res = await sendEmail({ to: "a@example.com", subject: "s", text: "t" });
    assert.deepEqual(res, { ok: true, provider: "resend" });
  });
});

describe("stripe (configured)", () => {
  it("reports configured and memoizes the client", () => {
    assert.equal(isStripeConfigured(), true);
    const a = getStripe();
    const b = getStripe();
    assert.ok(a, "client constructed");
    assert.equal(a, b, "client is memoized");
  });
  it("constructWebhookEvent returns null for an unverifiable signature", () => {
    // Client + secret + signature present, but the signature can't verify →
    // the catch path returns null instead of throwing.
    assert.equal(constructWebhookEvent('{"id":"evt_1"}', "t=1,v1=deadbeef"), null);
  });
  it("constructWebhookEvent parses a correctly-signed payload", () => {
    // Stripe signatures are HMAC-SHA256 of "<timestamp>.<payload>" with the
    // endpoint secret — we control the fake secret, so we can sign for real.
    const payload = JSON.stringify({ id: "evt_test_1", object: "event", type: "checkout.session.completed" });
    const t = Math.floor(Date.now() / 1000);
    const v1 = createHmac("sha256", "whsec_fake").update(`${t}.${payload}`).digest("hex");
    const event = constructWebhookEvent(payload, `t=${t},v1=${v1}`);
    assert.equal(event?.id, "evt_test_1");
    assert.equal(event?.type, "checkout.session.completed");
  });
});

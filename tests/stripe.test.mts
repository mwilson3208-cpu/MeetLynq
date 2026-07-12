import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

// These tests assert mock-mode behavior, so make sure no key is present
// BEFORE the module under test is imported (it reads env at import time).
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;

const { isStripeConfigured, getStripe, appUrl, createCheckout, constructWebhookEvent } =
  await import("../src/lib/stripe");

describe("stripe (mock mode — no STRIPE_SECRET_KEY)", () => {
  it("reports unconfigured", () => {
    assert.equal(isStripeConfigured(), false);
    assert.equal(getStripe(), null);
  });

  it("createCheckout short-circuits to the success URL with mock marker", async () => {
    const url = await createCheckout({
      orderId: "o1",
      email: "a@example.com",
      ticketName: "GA",
      amountCents: 5000,
      currency: "USD",
      successUrl: "http://x.test/e/demo/registered?order=o1",
      cancelUrl: "http://x.test/e/demo",
    });
    assert.equal(url, "http://x.test/e/demo/registered?order=o1&mock=1");
  });

  it("constructWebhookEvent returns null without client/secret/signature", () => {
    assert.equal(constructWebhookEvent("{}", null), null);
    assert.equal(constructWebhookEvent("{}", "sig_header"), null);
  });
});

describe("appUrl", () => {
  const saved = process.env.NEXT_PUBLIC_APP_URL;
  const savedProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const savedVercel = process.env.VERCEL_URL;
  before(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
  });
  after(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = saved;
    if (savedProd === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    else process.env.VERCEL_PROJECT_PRODUCTION_URL = savedProd;
    if (savedVercel === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = savedVercel;
  });

  // Outside a request scope headers() throws, so appUrl falls back to env.
  it("defaults to localhost with no env and no request", async () => {
    assert.equal(await appUrl(), "http://localhost:3000");
  });
  it("strips a trailing slash from the explicit env", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://meetlynq.example/";
    assert.equal(await appUrl(), "https://meetlynq.example");
    delete process.env.NEXT_PUBLIC_APP_URL;
  });
  it("uses the Vercel production domain when set", async () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "meetlynk.app";
    assert.equal(await appUrl(), "https://meetlynk.app");
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });
  it("falls back to the deployment URL", async () => {
    process.env.VERCEL_URL = "meet-lynq-abc123.vercel.app";
    assert.equal(await appUrl(), "https://meet-lynq-abc123.vercel.app");
    delete process.env.VERCEL_URL;
  });
});

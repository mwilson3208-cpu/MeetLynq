import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Browser, BrowserContext, Page } from "playwright-core";
import { BASE, db, serverReachable, launchBrowser, hydrate, crashed, login, uniq } from "./harness";

// Release-gate coverage that the core-workflows journey doesn't exercise:
// auth negatives, protected/invalid routes, public form validation, responsive
// layouts, keyboard access, and console/network health on critical pages.

const up = await serverReachable();

if (!up) {
  describe("release gates", () => {
    it("skipped — server not reachable", { skip: true }, () => {});
  });
} else {
  let browser: Browser;
  let ctx: BrowserContext;
  let page: Page;

  // Deterministic fixture: an organizer-owned published event with one free
  // ticket and no custom questions, created directly so tests don't depend on
  // seed-data drift.
  let eventSlug: string;
  let eventId: string;

  before(async () => {
    browser = await launchBrowser();
    ctx = await browser.newContext();
    page = await ctx.newPage();

    const org = await db.organization.findFirst({
      where: { members: { some: { user: { email: "organizer@meetlynq.com" } } } },
    });
    assert.ok(org, "seeded organizer org exists");
    eventSlug = uniq("gate-event").toLowerCase();
    const event = await db.event.create({
      data: {
        organizationId: org!.id,
        name: "Release Gate Event",
        slug: eventSlug,
        status: "PUBLISHED",
        tickets: { create: { name: "Free Pass", type: "FREE", priceCents: 0 } },
      },
    });
    eventId = event.id;
  });

  after(async () => {
    await db.event.delete({ where: { id: eventId } }).catch(() => {});
    await browser?.close();
    await db.$disconnect();
  });

  describe("A. Auth and access control", () => {
    it("rejects a wrong password with a clear error, without navigating", async () => {
      await page.goto(`${BASE}/login`, { waitUntil: "load" });
      await hydrate(page, 2000);
      await page.fill('input[name="email"]', "organizer@meetlynq.com");
      await page.fill('input[name="password"]', "definitely-wrong");
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2500);
      assert.match(page.url(), /\/login/, "stays on the login page");
      assert.ok(
        (await page.locator("text=/invalid email or password/i").count()) > 0,
        "shows the invalid-credentials error"
      );
    });

    it("redirects anonymous visitors away from protected routes", async () => {
      const anon = await browser.newContext();
      const p = await anon.newPage();
      for (const route of ["/dashboard", `/dashboard/events/${eventId}/settings`]) {
        await p.goto(`${BASE}${route}`, { waitUntil: "load" });
        await p.waitForTimeout(600);
        assert.doesNotMatch(p.url(), new RegExp(`${route}$`), `${route} does not render for anonymous`);
        assert.equal(await crashed(p), false, "no crash screen");
      }
      await anon.close();
    });

    it("serves a branded 404 for invalid routes", async () => {
      const res = await page.goto(`${BASE}/definitely/not/a/route`, { waitUntil: "load" });
      assert.equal(res?.status(), 404, "HTTP 404 status");
      assert.equal(await crashed(page), false, "no crash screen");
    });

    it("logs in and out with session enforcement", async () => {
      const c2 = await browser.newContext();
      const p = await login(c2, "organizer@meetlynq.com", "password123");
      assert.match(p.url(), /\/dashboard/, "login lands on the dashboard");
      // Log out via the header control, then confirm protected routes lock again.
      await p.locator('a[href="/logout"], button[aria-label*="out" i], a[aria-label*="out" i], form[action*="logout"] button').first().click().catch(async () => {
        await p.goto(`${BASE}/logout`, { waitUntil: "load" }).catch(() => {});
      });
      await p.waitForTimeout(1200);
      await p.goto(`${BASE}/dashboard`, { waitUntil: "load" });
      await p.waitForTimeout(600);
      assert.doesNotMatch(p.url(), /\/dashboard$/, "session is gone after logout");
      await c2.close();
    });
  });

  describe("B. Public registration form validation", () => {
    it("blocks submission with an invalid email and preserves input", async () => {
      await page.goto(`${BASE}/e/${eventSlug}`, { waitUntil: "load" });
      await hydrate(page, 2000);
      await page.fill('input[name="firstName"]', "Gate");
      await page.fill('input[name="lastName"]', "Tester");
      await page.fill('input[name="email"]', "not-an-email");
      await page.getByRole("button", { name: /complete registration|continue to checkout/i }).click();
      await page.waitForTimeout(1500);
      // Either the browser's built-in validation or the server error holds the page.
      assert.match(page.url(), new RegExp(`/e/${eventSlug}`), "stays on the event page");
      const rows = await db.registration.count({ where: { eventId, email: "not-an-email" } });
      assert.equal(rows, 0, "no bogus registration persisted");
      assert.equal(await page.inputValue('input[name="firstName"]'), "Gate", "input preserved");
    });

    it("prevents duplicate registration for the same email", async () => {
      const email = `${uniq("dupe")}@example.com`.toLowerCase();
      for (let attempt = 1; attempt <= 2; attempt++) {
        await page.goto(`${BASE}/e/${eventSlug}`, { waitUntil: "load" });
        await hydrate(page, 2000);
        await page.fill('input[name="firstName"]', "Dupe");
        await page.fill('input[name="lastName"]', "Check");
        await page.fill('input[name="email"]', email);
        await page.getByRole("button", { name: /complete registration/i }).click();
        await page.waitForTimeout(2500);
      }
      const rows = await db.registration.count({ where: { eventId, email } });
      assert.equal(rows, 1, "second attempt did not create a duplicate");
      assert.ok(
        (await page.locator("text=/already registered/i").count()) > 0,
        "duplicate attempt shows the already-registered error"
      );
    });
  });

  describe("C. Responsive layouts", () => {
    const viewports = [
      { name: "mobile", width: 375, height: 812 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "desktop", width: 1440, height: 900 },
    ];
    const pages = () => [`/e/${eventSlug}`, "/login", "/"];

    for (const vp of viewports) {
      it(`${vp.name} (${vp.width}×${vp.height}): no horizontal overflow, CTA visible`, async () => {
        const c = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const p = await c.newPage();
        for (const path of pages()) {
          await p.goto(`${BASE}${path}`, { waitUntil: "load" });
          await p.waitForTimeout(800);
          const overflow = await p.evaluate(
            () => document.scrollingElement!.scrollWidth - document.documentElement.clientWidth
          );
          assert.ok(overflow <= 1, `${path} has no horizontal overflow at ${vp.name} (got ${overflow}px)`);
          assert.equal(await crashed(p), false, `${path} renders at ${vp.name}`);
        }
        // The registration CTA must be reachable on the public event page.
        await p.goto(`${BASE}/e/${eventSlug}`, { waitUntil: "load" });
        await p.waitForTimeout(600);
        assert.ok(
          (await p.getByRole("button", { name: /complete registration/i }).count()) > 0,
          `registration CTA present at ${vp.name}`
        );
        await c.close();
      });
    }

    it("organizer dashboard fits mobile and desktop widths", async () => {
      const c = await browser.newContext({ viewport: { width: 375, height: 812 } });
      const p = await login(c, "organizer@meetlynq.com", "password123");
      for (const [w, h] of [[375, 812], [1440, 900]] as const) {
        await p.setViewportSize({ width: w, height: h });
        await p.goto(`${BASE}/dashboard`, { waitUntil: "load" });
        await p.waitForTimeout(900);
        const overflow = await p.evaluate(
          () => document.scrollingElement!.scrollWidth - document.documentElement.clientWidth
        );
        assert.ok(overflow <= 1, `dashboard has no horizontal overflow at ${w}px (got ${overflow}px)`);
      }
      await c.close();
    });
  });

  describe("D. Keyboard accessibility", () => {
    it("login form is fully keyboard-operable in a logical order", async () => {
      const c = await browser.newContext();
      const p = await c.newPage();
      await p.goto(`${BASE}/login`, { waitUntil: "load" });
      await hydrate(p, 1500);
      await p.locator('input[name="email"]').focus();
      await p.keyboard.type("organizer@meetlynq.com");
      await p.keyboard.press("Tab");
      const focused = await p.evaluate(() => (document.activeElement as HTMLInputElement)?.name ?? "");
      assert.equal(focused, "password", "Tab moves from email to password");
      await p.keyboard.type("password123");
      await p.keyboard.press("Enter");
      await p.waitForURL("**/dashboard", { timeout: 20000 });
      assert.match(p.url(), /\/dashboard/, "Enter submits the form");
      await c.close();
    });

    it("form fields have programmatic labels and buttons have names", async () => {
      await page.goto(`${BASE}/e/${eventSlug}`, { waitUntil: "load" });
      await page.waitForTimeout(800);
      const audit = await page.evaluate(() => {
        const unlabeled: string[] = [];
        document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]), select, textarea").forEach((el) => {
          const id = el.getAttribute("id");
          const byFor = id ? document.querySelector(`label[for="${id}"]`) : null;
          const wrapped = el.closest("label");
          const aria = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
          if (!byFor && !wrapped && !aria) unlabeled.push(`${el.tagName.toLowerCase()}[name=${el.getAttribute("name")}]`);
        });
        const nameless: string[] = [];
        document.querySelectorAll("button, a[role=button]").forEach((el) => {
          const text = (el.textContent ?? "").trim();
          const aria = el.getAttribute("aria-label");
          if (!text && !aria) nameless.push(el.outerHTML.slice(0, 60));
        });
        const h1s = document.querySelectorAll("h1").length;
        return { unlabeled, nameless, h1s };
      });
      assert.deepEqual(audit.unlabeled, [], "every visible form control has a label");
      assert.deepEqual(audit.nameless, [], "every button has an accessible name");
      assert.ok(audit.h1s >= 1, "page has a top-level heading");
    });
  });

  describe("E. Console and network health", () => {
    it("critical pages produce no console errors or failed requests", async () => {
      const c = await browser.newContext();
      const p = await login(c, "organizer@meetlynq.com", "password123");
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];
      p.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 120)}`));
      p.on("console", (m) => {
        if (m.type() === "error") consoleErrors.push(`console: ${m.text().slice(0, 120)}`);
      });
      p.on("requestfailed", (r) => {
        // Router prefetch cancellations abort by design; anything else is real.
        if (r.failure()?.errorText !== "net::ERR_ABORTED") {
          failedRequests.push(`${r.method()} ${r.url().slice(0, 100)} → ${r.failure()?.errorText}`);
        }
      });
      p.on("response", (r) => {
        if (r.status() >= 500) failedRequests.push(`${r.request().method()} ${r.url().slice(0, 100)} → HTTP ${r.status()}`);
      });

      const routes = [
        "/dashboard",
        "/dashboard/events",
        `/dashboard/events/${eventId}`,
        `/dashboard/events/${eventId}/builder`,
        `/dashboard/events/${eventId}/registration`,
        `/dashboard/events/${eventId}/attendees`,
        `/dashboard/events/${eventId}/settings`,
        `/e/${eventSlug}`,
      ];
      for (const route of routes) {
        await p.goto(`${BASE}${route}`, { waitUntil: "load" });
        await p.waitForTimeout(1000);
        assert.equal(await crashed(p), false, `${route} renders without a crash screen`);
      }
      assert.deepEqual(consoleErrors, [], "no browser console errors");
      assert.deepEqual(failedRequests, [], "no failed network requests");
      await c.close();
    });
  });
}

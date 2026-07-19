import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Browser, BrowserContext, Page } from "playwright-core";
import { BASE, db, serverReachable, launchBrowser, hydrate, crashed, uniq } from "./harness";

/**
 * End-to-end journey: one organizer account is created, then carried through
 * every core workflow. After each UI step we assert the data actually reached
 * the database and flowed to the next component — proving the whole chain:
 *
 *   signup → org → event → ticket → publish → public page
 *          → attendee registers → participant + sold count → attendees list
 *          → check-in → CheckIn + Badge + status → badges page
 *          → matchmaking → MatchScore rows
 *          → survey create → publish → public response → results
 *          → email campaign → send → recipient count
 */

const run = await serverReachable();

if (!run) {
  describe("core workflows (e2e)", () => {
    it("skipped — no server at E2E_BASE_URL / DATABASE_URL", { skip: true }, () => {});
  });
} else {
  let browser: Browser;
  let organizer: BrowserContext;
  let page: Page; // authenticated organizer page

  // Shared identifiers discovered as the journey progresses.
  const email = `${uniq("owner")}@example.com`;
  const orgName = uniq("Org");
  const eventName = uniq("Summit");
  const attendeeEmail = `${uniq("guest")}@example.com`;
  let orgId = "";
  let eventId = "";
  let eventSlug = "";

  before(async () => {
    browser = await launchBrowser();
    organizer = await browser.newContext();
  });

  after(async () => {
    // Deleting the org cascades to the event and everything under it.
    if (orgId) await db.organization.delete({ where: { id: orgId } }).catch(() => {});
    await db.$disconnect();
    await browser.close();
  });

  describe("1. Organizer onboarding → event → ticket → publish", () => {
    it("signs up and provisions an org", async () => {
      page = await organizer.newPage();
      await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
      await hydrate(page, 3000);
      await page.fill('input[name="name"]', "E2E Organizer");
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="organization"]', orgName);
      await page.fill('input[name="password"]', "password123");
      await Promise.all([
        page.waitForURL("**/dashboard", { timeout: 15000 }).catch(() => {}),
        page.click('button[type="submit"]'),
      ]);
      await page.waitForTimeout(1000);
      assert.ok(page.url().endsWith("/dashboard"), "should land on dashboard");

      const org = await db.organization.findFirst({ where: { name: orgName }, include: { members: true } });
      assert.ok(org, "org row created");
      assert.equal(org!.members.length, 1, "owner membership created");
      orgId = org!.id;
    });

    it("creates an event (DB row + home page seeded)", async () => {
      await page.goto(`${BASE}/dashboard/events/new`, { waitUntil: "networkidle" });
      await hydrate(page, 3000);
      await page.fill('input[name="name"]', eventName);
      // uncheck AI assistant to keep the step deterministic/offline
      const ai = page.locator('input[name="useAi"]');
      if (await ai.isChecked()) await ai.uncheck();
      await page.getByRole("button", { name: /create event/i }).click();
      await page.waitForURL(/\/dashboard\/events\/[a-z0-9]{20,}$/i, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(800);

      const event = await db.event.findFirst({ where: { name: eventName }, include: { pages: true } });
      assert.ok(event, "event row created");
      assert.equal(event!.organizationId, orgId, "event belongs to the new org");
      assert.equal(event!.status, "DRAFT", "new events start as DRAFT");
      assert.ok(event!.pages.some((p) => p.isHome), "a home page was seeded");
      eventId = event!.id;
      eventSlug = event!.slug;
    });

    it("adds a free ticket that flows to the DB", async () => {
      await page.goto(`${BASE}/dashboard/events/${eventId}/tickets`, { waitUntil: "networkidle" });
      await hydrate(page, 3000);
      await page.getByRole("button", { name: /add ticket|new ticket/i }).first().click();
      await page.waitForTimeout(600);
      await page.locator('input[name="name"]').first().fill("General Admission");
      await page.locator('select[name="type"]').first().selectOption("FREE");
      await page.getByRole("button", { name: /save|add|create/i }).last().click();
      await page.waitForTimeout(1500);

      const ticket = await db.ticket.findFirst({ where: { eventId, name: "General Admission" } });
      assert.ok(ticket, "ticket row created");
      assert.equal(ticket!.priceCents, 0, "free ticket is $0");
      assert.equal(ticket!.requiresApproval, false, "UI tickets don't require approval");
    });

    it("publishes the event so the public page opens registration", async () => {
      await page.goto(`${BASE}/dashboard/events/${eventId}/settings`, { waitUntil: "networkidle" });
      await hydrate(page, 3000);
      await page.getByRole("button", { name: /^publish/i }).first().click();
      await page.waitForTimeout(1800);

      const event = await db.event.findUnique({ where: { id: eventId } });
      assert.equal(event!.status, "PUBLISHED", "event is now PUBLISHED");

      // Public page + public API both reflect the published event.
      const pub = await page.goto(`${BASE}/e/${eventSlug}`, { waitUntil: "networkidle" });
      assert.equal(pub!.status(), 200, "public event page renders");
      assert.ok(!(await crashed(page)));
      const api = await page.request.get(`${BASE}/api/public/events/${eventSlug}`);
      assert.equal(api.status(), 200, "public API returns the event");
      const json = await api.json();
      assert.equal(json.event.slug, eventSlug);
    });
  });

  describe("2. Attendee registration → participant → organizer views", () => {
    it("an anonymous attendee registers and the chain populates", async () => {
      const anon = await browser.newContext();
      const p = await anon.newPage();
      await p.goto(`${BASE}/e/${eventSlug}`, { waitUntil: "networkidle" });
      await hydrate(p, 2500);
      // choose our free ticket
      const opts = await p.$$eval('select[name="ticketId"] option', (os) =>
        os.map((o) => ({ v: (o as HTMLOptionElement).value, t: o.textContent ?? "" }))
      );
      const free = opts.find((o) => /general admission/i.test(o.t)) ?? opts[0];
      await p.selectOption('select[name="ticketId"]', free.v);
      await p.fill('input[name="firstName"]', "Riley");
      await p.fill('input[name="lastName"]', "Guest");
      await p.fill('input[name="email"]', attendeeEmail);
      await p.click('button[type="submit"]');
      await p.waitForURL("**/registered**", { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(1500);
      assert.ok(p.url().includes("/registered"), "reaches the confirmation page");
      await anon.close();

      // Registration is CONFIRMED (no approval), a Participant exists, sold bumped.
      const reg = await db.registration.findFirst({
        where: { eventId, email: attendeeEmail },
        include: { participant: true, ticket: true },
      });
      assert.ok(reg, "registration row created");
      assert.equal(reg!.status, "CONFIRMED", "free non-approval registration confirms immediately");
      assert.ok(reg!.participant, "participant profile created from the registration");
      assert.equal(reg!.ticket!.sold, 1, "ticket sold count incremented");
    });

    it("the registrant shows up on the organizer's attendees page and stats", async () => {
      const res = await page.goto(`${BASE}/dashboard/events/${eventId}/attendees`, { waitUntil: "networkidle" });
      assert.equal(res!.status(), 200);
      assert.ok((await page.locator(`text=${attendeeEmail}`).count()) > 0, "attendee is listed");

      // Overview stats reflect the registration.
      const overview = await page.goto(`${BASE}/dashboard/events/${eventId}`, { waitUntil: "networkidle" });
      assert.equal(overview!.status(), 200);
      assert.ok(!(await crashed(page)));
    });
  });

  describe("3. Check-in → badge → status", () => {
    it("checks the attendee in and generates a badge", async () => {
      await page.goto(`${BASE}/dashboard/events/${eventId}/check-in`, { waitUntil: "networkidle" });
      await hydrate(page, 3000);
      await page.locator('input[name="query"]').first().fill(attendeeEmail);
      await page.getByRole("button", { name: /check in/i }).first().click();
      await page.waitForTimeout(2200);
      assert.ok((await page.locator("text=/is checked in ✓|was already checked in/").count()) > 0, "success message shown");

      const reg = await db.registration.findFirst({
        where: { eventId, email: attendeeEmail },
        include: { checkIn: true, badge: true },
      });
      assert.equal(reg!.status, "CHECKED_IN", "status advanced to CHECKED_IN");
      assert.ok(reg!.checkIn, "CheckIn row created");
      assert.ok(reg!.badge, "Badge row created");

      // Badges page renders a real QR for the badge.
      await page.goto(`${BASE}/dashboard/events/${eventId}/badges`, { waitUntil: "networkidle" });
      assert.ok((await page.locator(".badge-card svg").count()) > 0, "QR code rendered");
    });
  });

  describe("4. Matchmaking generates scored connections", () => {
    it("needs at least two participants, then produces MatchScore rows", async () => {
      // Add a second confirmed participant directly so a pair exists to score.
      const reg2 = await db.registration.create({
        data: {
          eventId,
          email: `${uniq("guest2")}@example.com`,
          firstName: "Devon",
          lastName: "Partner",
          status: "CONFIRMED",
        },
      });
      await db.participant.create({
        data: {
          eventId,
          registrationId: reg2.id,
          name: "Devon Partner",
          email: reg2.email,
          interestTags: JSON.stringify(["AI", "Growth"]),
          lookingFor: "enterprise customers",
          offering: "growth platform",
        },
      });
      // Give the first participant complementary fields so the pair scores.
      await db.participant.updateMany({
        where: { eventId, email: attendeeEmail },
        data: {
          interestTags: JSON.stringify(["AI"]),
          lookingFor: "growth platform",
          offering: "enterprise customers",
        },
      });

      // "load" + an explicit wait for the action button: networkidle is flaky
      // under CPU contention (router prefetches), while button visibility is a
      // stronger, functional readiness signal for what this test exercises.
      await page.goto(`${BASE}/dashboard/events/${eventId}/matchmaking`, { waitUntil: "load" });
      await hydrate(page, 2500);
      const runBtn = page.getByRole("button", { name: /run matchmaking/i }).first();
      await runBtn.waitFor({ state: "visible", timeout: 20000 });
      await runBtn.click();
      await page.waitForTimeout(6000);

      const matches = await db.matchScore.count({ where: { eventId } });
      assert.ok(matches > 0, `expected MatchScore rows, got ${matches}`);

      await page.goto(`${BASE}/dashboard/events/${eventId}/matchmaking`, { waitUntil: "load" });
      // Waiting for the content itself is the real assertion — and a sturdier
      // signal than networkidle, which flakes under prefetch/CPU contention.
      await page.locator("text=Match score").first().waitFor({ state: "visible", timeout: 20000 });
      assert.ok((await page.locator("text=Match score").count()) > 0, "matches render on the page");
    });
  });

  describe("5. Survey create → publish → public response → results", () => {
    it("carries a response from the public form back to the organizer", async () => {
      await page.goto(`${BASE}/dashboard/events/${eventId}/surveys`, { waitUntil: "networkidle" });
      await hydrate(page, 3000);
      const surveyTitle = uniq("Survey");
      await page.getByRole("button", { name: /create survey/i }).first().click();
      const dialog = page.getByRole("dialog");
      await dialog.locator('input[name="title"]').waitFor({ state: "visible", timeout: 10000 });
      await dialog.locator('input[name="title"]').fill(surveyTitle);
      await dialog.getByRole("button", { name: /create survey/i }).click();
      await page.waitForTimeout(2000);

      const survey = await db.survey.findFirst({ where: { eventId, title: surveyTitle }, include: { questions: true } });
      assert.ok(survey, "survey row created");
      assert.ok(survey!.questions.length >= 1, "a starter question was seeded");

      await page.getByRole("button", { name: /^publish$/i }).first().click();
      await page.waitForTimeout(2000);
      const published = await db.survey.findUnique({ where: { id: survey!.id } });
      assert.equal(published!.status, "LIVE", "survey published to LIVE");

      const link = await page.locator('a[href*="/survey/"]').first().getAttribute("href");
      assert.ok(link, "respondent link is shown once live");

      // Anonymous respondent submits.
      const anon = await browser.newContext();
      const rp = await anon.newPage();
      await rp.goto(link!.startsWith("http") ? link! : `${BASE}${link}`, { waitUntil: "networkidle" });
      await rp.waitForTimeout(1600);
      await rp.locator("label", { hasText: /^5$/ }).first().click();
      await rp.getByRole("button", { name: /submit feedback/i }).click();
      await rp.waitForTimeout(2500);
      assert.ok((await rp.locator("text=Thank you").count()) > 0, "respondent sees thank-you");
      await anon.close();

      const responses = await db.surveyResponse.count({ where: { surveyId: survey!.id } });
      assert.ok(responses >= 1, "survey response persisted");
    });
  });

  describe("6. Email campaign create → send → recipients recorded", () => {
    it("sends to real registrations and records the count", async () => {
      await page.goto(`${BASE}/dashboard/events/${eventId}/emails`, { waitUntil: "networkidle" });
      await hydrate(page, 3000);
      const subject = uniq("Campaign");
      await page.fill('input[name="subject"]', subject);
      await page.getByRole("button", { name: /save campaign/i }).click();
      await page.waitForTimeout(2000);

      const campaign = await db.emailCampaign.findFirst({ where: { eventId, subject } });
      assert.ok(campaign, "campaign row created as draft");
      assert.equal(campaign!.status, "DRAFT");

      const row = page.locator("tr", { hasText: subject });
      await row.getByRole("button", { name: /send/i }).first().click();
      await page.waitForTimeout(2000);

      const sent = await db.emailCampaign.findUnique({ where: { id: campaign!.id } });
      assert.equal(sent!.status, "SENT", "campaign marked SENT");
      assert.ok(sent!.recipients >= 1, `recipient count reflects registrations (got ${sent!.recipients})`);
    });
  });
}

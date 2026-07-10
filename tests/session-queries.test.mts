import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert/strict";

// Covers the session half of auth.ts (createSession / destroySession /
// getCurrentUser) and all of queries.ts by mocking next/headers with an
// in-memory cookie store. Requires a database; skipped without DATABASE_URL.
// Run via `npm test` (the script passes --experimental-test-module-mocks).

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  describe("auth sessions + queries (integration)", () => {
    it("skipped — DATABASE_URL not set", { skip: true }, () => {});
  });
} else {
  const jar = new Map<string, { value: string; opts?: Record<string, unknown> }>();
  const cookieStore = {
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
    getAll: () => [...jar].map(([name, v]) => ({ name, value: v.value })),
    set: (name: string, value: string, opts?: Record<string, unknown>) => void jar.set(name, { value, opts }),
    delete: (name: string) => void jar.delete(name),
  };
  mock.module("next/headers", { namedExports: { cookies: async () => cookieStore } });

  const { db } = await import("../src/lib/db");
  const { createSession, destroySession, getCurrentUser } = await import("../src/lib/auth");
  const { requireOrg, getEventOr404, getEventStats } = await import("../src/lib/queries");

  const suffix = `sq-${Date.now().toString(36)}`;
  let userId: string;
  let orphanUserId: string; // user with no org membership
  let orgId: string;
  let eventId: string;
  let foreignEventId: string; // event owned by a different org

  before(async () => {
    const org = await db.organization.create({
      data: { name: `SQ Org ${suffix}`, slug: `sq-org-${suffix}` },
    });
    orgId = org.id;
    const user = await db.user.create({
      data: {
        name: "Session Tester",
        email: `sq-${suffix}@example.com`,
        passwordHash: "x:y",
        memberships: { create: { organizationId: orgId, role: "OWNER" } },
      },
    });
    userId = user.id;
    const orphan = await db.user.create({
      data: { name: "No Org", email: `sq-orphan-${suffix}@example.com`, passwordHash: "x:y" },
    });
    orphanUserId = orphan.id;
    const event = await db.event.create({
      data: { organizationId: orgId, name: `SQ Event ${suffix}`, slug: `sq-event-${suffix}` },
    });
    eventId = event.id;
    const foreignOrg = await db.organization.create({
      data: { name: `SQ Foreign ${suffix}`, slug: `sq-foreign-${suffix}` },
    });
    const foreign = await db.event.create({
      data: { organizationId: foreignOrg.id, name: `SQ Foreign Event ${suffix}`, slug: `sq-fev-${suffix}` },
    });
    foreignEventId = foreign.id;
  });

  after(async () => {
    await db.user.deleteMany({ where: { email: { startsWith: "sq-" } } }).catch(() => {});
    await db.organization.deleteMany({ where: { slug: { startsWith: "sq-" } } }).catch(() => {});
    await db.$disconnect();
  });

  describe("createSession / getCurrentUser / destroySession", () => {
    it("sets an HMAC-signed, httpOnly session cookie", async () => {
      await createSession(userId);
      const cookie = jar.get("meetlynq_session");
      assert.ok(cookie, "cookie should be set");
      assert.ok(cookie!.value.startsWith(`${userId}.`), "value is userId.signature");
      assert.equal(cookie!.opts?.httpOnly, true);
      assert.equal(cookie!.opts?.sameSite, "lax");
    });

    it("getCurrentUser resolves the user with memberships", async () => {
      const user = await getCurrentUser();
      assert.equal(user?.id, userId);
      assert.equal(user?.memberships[0]?.organization.id, orgId);
    });

    it("rejects a tampered cookie signature", async () => {
      const original = jar.get("meetlynq_session")!.value;
      jar.set("meetlynq_session", { value: original.slice(0, -1) + (original.endsWith("0") ? "1" : "0") });
      assert.equal(await getCurrentUser(), null);
      jar.set("meetlynq_session", { value: original }); // restore
    });

    it("rejects a forged cookie without a signature", async () => {
      jar.set("meetlynq_session", { value: userId });
      assert.equal(await getCurrentUser(), null);
      await createSession(userId); // restore
    });

    it("returns null for a validly-signed but deleted user", async () => {
      await createSession("ghost-user-id");
      assert.equal(await getCurrentUser(), null);
      await createSession(userId); // restore
    });

    it("destroySession clears the cookie", async () => {
      await destroySession();
      assert.equal(jar.has("meetlynq_session"), false);
      assert.equal(await getCurrentUser(), null);
      await createSession(userId); // restore for later suites
    });
  });

  describe("requireOrg", () => {
    it("returns the user and their first organization", async () => {
      const { user, org } = await requireOrg();
      assert.equal(user.id, userId);
      assert.equal(org.id, orgId);
    });
    it("404s when unauthenticated", async () => {
      await destroySession();
      await assert.rejects(requireOrg());
      await createSession(userId);
    });
    it("404s for a user without any organization", async () => {
      await createSession(orphanUserId);
      await assert.rejects(requireOrg());
      await createSession(userId);
    });
  });

  describe("getEventOr404", () => {
    it("returns an event owned by the current org", async () => {
      const event = await getEventOr404(eventId);
      assert.equal(event.id, eventId);
    });
    it("404s for another org's event (authorization)", async () => {
      await assert.rejects(getEventOr404(foreignEventId));
    });
    it("404s for a nonexistent event", async () => {
      await assert.rejects(getEventOr404("nope"));
    });
  });

  describe("getEventStats", () => {
    it("returns zeros for a fresh event", async () => {
      const s = await getEventStats(eventId);
      assert.deepEqual(s, {
        registrations: 0,
        checkedIn: 0,
        participants: 0,
        meetings: 0,
        sessions: 0,
        sponsors: 0,
        exhibitors: 0,
        leads: 0,
        revenueCents: 0,
      });
    });

    it("counts each entity and sums succeeded payments, excluding canceled regs", async () => {
      const reg = await db.registration.create({
        data: { eventId, email: `sq-a-${suffix}@example.com`, firstName: "A", lastName: "A", status: "CHECKED_IN" },
      });
      await db.registration.create({
        data: { eventId, email: `sq-b-${suffix}@example.com`, firstName: "B", lastName: "B", status: "CANCELED" },
      });
      await db.participant.create({
        data: { eventId, registrationId: reg.id, name: "A A", email: `sq-a-${suffix}@example.com` },
      });
      await db.meeting.create({ data: { eventId } });
      await db.session.create({ data: { eventId, title: "Talk" } });
      await db.sponsor.create({ data: { eventId, name: "Sponsor" } });
      await db.exhibitor.create({ data: { eventId, name: "Booth" } });
      await db.lead.create({ data: { eventId, name: "Lead" } });
      const order = await db.order.create({
        data: { eventId, email: `sq-a-${suffix}@example.com`, totalCents: 1234, status: "PAID" },
      });
      await db.payment.create({ data: { orderId: order.id, amountCents: 1234, status: "SUCCEEDED" } });

      const s = await getEventStats(eventId);
      assert.equal(s.registrations, 1, "CANCELED must not count");
      assert.equal(s.checkedIn, 1);
      assert.equal(s.participants, 1);
      assert.equal(s.meetings, 1);
      assert.equal(s.sessions, 1);
      assert.equal(s.sponsors, 1);
      assert.equal(s.exhibitors, 1);
      assert.equal(s.leads, 1);
      assert.equal(s.revenueCents, 1234);
    });
  });
}

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

// Integration tests for the registration domain logic, run against the real
// database in DATABASE_URL. Skipped entirely when DATABASE_URL is not set so
// `npm test` still works in environments without a database.
const DB_URL = process.env.DATABASE_URL;

// isAtCapacity is pure — test it unconditionally.
const { isAtCapacity } = await import("../src/lib/registration");
describe("isAtCapacity", () => {
  it("is never at capacity when capacity is null/undefined (unlimited)", () => {
    assert.equal(isAtCapacity(0, null), false);
    assert.equal(isAtCapacity(9999, null), false);
    assert.equal(isAtCapacity(9999, undefined), false);
  });
  it("is at capacity once active count reaches the cap", () => {
    assert.equal(isAtCapacity(4, 5), false);
    assert.equal(isAtCapacity(5, 5), true);
    assert.equal(isAtCapacity(6, 5), true);
  });
  it("treats a zero capacity as immediately full", () => {
    assert.equal(isAtCapacity(0, 0), true);
  });
});

if (!DB_URL) {
  describe("registration (integration)", () => {
    it("skipped — DATABASE_URL not set", { skip: true }, () => {});
  });
} else {
  const { db } = await import("../src/lib/db");
  const {
    resolveCoupon,
    alreadyRegistered,
    registerFree,
    startPaidRegistration,
    finalizeOrder,
    countActiveRegistrations,
    alreadyWaitlisted,
    registerWaitlist,
  } = await import("../src/lib/registration");

  const suffix = `test-${Date.now().toString(36)}`;
  let orgId: string;
  let eventId: string;
  let ticketId: string; // paid, no approval
  let approvalTicketId: string; // free, requires approval

  before(async () => {
    const org = await db.organization.create({
      data: { name: `Test Org ${suffix}`, slug: `test-org-${suffix}` },
    });
    orgId = org.id;
    const event = await db.event.create({
      data: { organizationId: orgId, name: `Test Event ${suffix}`, slug: `test-event-${suffix}`, status: "PUBLISHED" },
    });
    eventId = event.id;
    const ticket = await db.ticket.create({
      data: { eventId, name: "GA", type: "PAID", priceCents: 10000 },
    });
    ticketId = ticket.id;
    const approval = await db.ticket.create({
      data: { eventId, name: "Free Approval", type: "FREE", priceCents: 0, requiresApproval: true },
    });
    approvalTicketId = approval.id;
  });

  after(async () => {
    // Organization delete cascades events → tickets/registrations/orders/etc.
    await db.organization.delete({ where: { id: orgId } }).catch(() => {});
    await db.$disconnect();
  });

  describe("resolveCoupon", () => {
    it("returns null when no code is given", async () => {
      assert.equal(await resolveCoupon(eventId, null, 10000), null);
      assert.equal(await resolveCoupon(eventId, "", 10000), null);
    });
    it("returns null for an unknown code", async () => {
      assert.equal(await resolveCoupon(eventId, "NOPE", 10000), null);
    });
    it("applies percentOff", async () => {
      await db.coupon.create({ data: { eventId, code: "HALF", percentOff: 50 } });
      const r = await resolveCoupon(eventId, "HALF", 10000);
      assert.equal(r?.discountCents, 5000);
    });
    it("matches codes case-insensitively (uppercased)", async () => {
      const r = await resolveCoupon(eventId, "  half ", 10000);
      assert.equal(r?.discountCents, 5000);
    });
    it("applies amountOffCents and caps at the price", async () => {
      await db.coupon.create({ data: { eventId, code: "BIG", amountOffCents: 99999 } });
      const r = await resolveCoupon(eventId, "BIG", 10000);
      assert.equal(r?.discountCents, 10000);
    });
    it("combines percent + amount", async () => {
      await db.coupon.create({ data: { eventId, code: "COMBO", percentOff: 10, amountOffCents: 500 } });
      const r = await resolveCoupon(eventId, "COMBO", 10000);
      assert.equal(r?.discountCents, 1500);
    });
    it("rejects inactive coupons", async () => {
      await db.coupon.create({ data: { eventId, code: "OFF", percentOff: 10, isActive: false } });
      assert.equal(await resolveCoupon(eventId, "OFF", 10000), null);
    });
    it("rejects expired coupons", async () => {
      await db.coupon.create({
        data: { eventId, code: "OLD", percentOff: 10, expiresAt: new Date(Date.now() - 86400000) },
      });
      assert.equal(await resolveCoupon(eventId, "OLD", 10000), null);
    });
    it("rejects maxed-out coupons", async () => {
      await db.coupon.create({
        data: { eventId, code: "MAXED", percentOff: 10, maxRedemptions: 1, redemptions: 1 },
      });
      assert.equal(await resolveCoupon(eventId, "MAXED", 10000), null);
    });
  });

  describe("alreadyRegistered", () => {
    it("false when no registration exists", async () => {
      assert.equal(await alreadyRegistered(eventId, "nobody@example.com"), false);
    });
    it("true for CONFIRMED; matches email case-insensitively", async () => {
      await db.registration.create({
        data: { eventId, email: "dup@example.com", firstName: "D", lastName: "U", status: "CONFIRMED" },
      });
      assert.equal(await alreadyRegistered(eventId, "DUP@EXAMPLE.COM"), true);
    });
    it("false for PENDING (abandoned checkouts don't block retries)", async () => {
      await db.registration.create({
        data: { eventId, email: "pend@example.com", firstName: "P", lastName: "E", status: "PENDING" },
      });
      assert.equal(await alreadyRegistered(eventId, "pend@example.com"), false);
    });
  });

  describe("registerFree", () => {
    it("confirms immediately without approval and creates a participant", async () => {
      const before = (await db.ticket.findUnique({ where: { id: ticketId } }))!.sold;
      const regId = await registerFree({
        eventId,
        eventName: "Test Event",
        ticketId,
        requiresApproval: false,
        firstName: "Free",
        lastName: "Now",
        email: "Free.Now@Example.com",
      });
      const reg = await db.registration.findUnique({ where: { id: regId }, include: { participant: true } });
      assert.equal(reg?.status, "CONFIRMED");
      assert.equal(reg?.email, "free.now@example.com"); // lowercased
      assert.ok(reg?.participant, "participant should be created for confirmed registrations");
      const afterSold = (await db.ticket.findUnique({ where: { id: ticketId } }))!.sold;
      assert.equal(afterSold, before + 1);
    });
    it("goes PENDING with approval and defers the participant", async () => {
      const regId = await registerFree({
        eventId,
        eventName: "Test Event",
        ticketId: approvalTicketId,
        requiresApproval: true,
        firstName: "Wait",
        lastName: "Listed",
        email: "wait@example.com",
      });
      const reg = await db.registration.findUnique({ where: { id: regId }, include: { participant: true } });
      assert.equal(reg?.status, "PENDING");
      assert.equal(reg?.participant, null);
    });
  });

  describe("startPaidRegistration + finalizeOrder", () => {
    it("creates a PENDING order with correct totals and finalizes idempotently", async () => {
      const coupon = await resolveCoupon(eventId, "HALF", 10000); // 5000 off
      const { orderId, totalCents } = await startPaidRegistration({
        eventId,
        ticketId,
        firstName: "Pay",
        lastName: "Er",
        email: "payer@example.com",
        priceCents: 10000,
        currency: "USD",
        coupon,
      });
      assert.equal(totalCents, 5000);

      const order = await db.order.findUnique({ where: { id: orderId }, include: { registrations: true } });
      assert.equal(order?.status, "PENDING");
      assert.equal(order?.subtotalCents, 10000);
      assert.equal(order?.discountCents, 5000);
      assert.equal(order?.registrations[0]?.status, "PENDING");

      const soldBefore = (await db.ticket.findUnique({ where: { id: ticketId } }))!.sold;

      // First finalize succeeds…
      assert.equal(await finalizeOrder(orderId), true);
      const paid = await db.order.findUnique({
        where: { id: orderId },
        include: { registrations: { include: { participant: true } }, payment: true },
      });
      assert.equal(paid?.status, "PAID");
      assert.equal(paid?.payment?.status, "SUCCEEDED");
      assert.equal(paid?.payment?.amountCents, 5000);
      assert.equal(paid?.registrations[0]?.status, "CONFIRMED");
      assert.ok(paid?.registrations[0]?.participant);
      const soldAfter = (await db.ticket.findUnique({ where: { id: ticketId } }))!.sold;
      assert.equal(soldAfter, soldBefore + 1);

      // …second finalize is a no-op.
      assert.equal(await finalizeOrder(orderId), false);
      const soldAgain = (await db.ticket.findUnique({ where: { id: ticketId } }))!.sold;
      assert.equal(soldAgain, soldAfter, "sold count must not double-increment");
    });

    it("increments coupon redemptions when used", async () => {
      const beforeC = (await db.coupon.findFirst({ where: { eventId, code: "COMBO" } }))!.redemptions;
      const coupon = await resolveCoupon(eventId, "COMBO", 10000);
      await startPaidRegistration({
        eventId,
        ticketId,
        firstName: "Coup",
        lastName: "On",
        email: "coupon@example.com",
        priceCents: 10000,
        currency: "USD",
        coupon,
      });
      const afterC = (await db.coupon.findFirst({ where: { eventId, code: "COMBO" } }))!.redemptions;
      assert.equal(afterC, beforeC + 1);
    });

    it("clamps the total at 0 when the discount exceeds the price", async () => {
      const { totalCents } = await startPaidRegistration({
        eventId,
        ticketId,
        firstName: "Zero",
        lastName: "Due",
        email: "zero@example.com",
        priceCents: 1000,
        currency: "USD",
        coupon: { id: "synthetic", code: "SYN", discountCents: 5000 },
      });
      assert.equal(totalCents, 0);
    });

    it("finalizeOrder returns false for an unknown order", async () => {
      assert.equal(await finalizeOrder("does-not-exist"), false);
    });
  });

  describe("waitlist", () => {
    it("countActiveRegistrations counts CONFIRMED/CHECKED_IN/PENDING but not WAITLISTED/CANCELED", async () => {
      const wlEvent = await db.event.create({
        data: { organizationId: orgId, name: `WL ${suffix}`, slug: `wl-event-${suffix}`, status: "PUBLISHED" },
      });
      const mk = (email: string, status: string) =>
        db.registration.create({ data: { eventId: wlEvent.id, email, firstName: "A", lastName: "B", status } });
      await mk("c1@example.com", "CONFIRMED");
      await mk("c2@example.com", "CHECKED_IN");
      await mk("c3@example.com", "PENDING");
      await mk("c4@example.com", "WAITLISTED");
      await mk("c5@example.com", "CANCELED");
      assert.equal(await countActiveRegistrations(wlEvent.id), 3);
    });

    it("registerWaitlist creates a WAITLISTED reg with no participant and no sold bump", async () => {
      const wlTicket = await db.ticket.create({
        data: { eventId, name: "WL Ticket", type: "FREE", priceCents: 0 },
      });
      const soldBefore = (await db.ticket.findUnique({ where: { id: wlTicket.id } }))!.sold;
      const regId = await registerWaitlist({
        eventId,
        eventName: "Test Event",
        ticketId: wlTicket.id,
        firstName: "Wait",
        lastName: "List",
        email: "Waitlist.User@Example.com",
      });
      const reg = await db.registration.findUnique({ where: { id: regId }, include: { participant: true } });
      assert.equal(reg?.status, "WAITLISTED");
      assert.equal(reg?.email, "waitlist.user@example.com"); // lowercased
      assert.equal(reg?.participant, null, "waitlisted registrations don't get a participant");
      const soldAfter = (await db.ticket.findUnique({ where: { id: wlTicket.id } }))!.sold;
      assert.equal(soldAfter, soldBefore, "waitlisting must not increment sold");
    });

    it("alreadyWaitlisted detects an existing waitlist entry, case-insensitively", async () => {
      assert.equal(await alreadyWaitlisted(eventId, "nobody-wl@example.com"), false);
      assert.equal(await alreadyWaitlisted(eventId, "WAITLIST.USER@EXAMPLE.COM"), true);
    });
  });
}

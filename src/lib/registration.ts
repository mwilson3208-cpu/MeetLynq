import { db } from "./db";
import { sendEmail, EMAIL_TEMPLATES } from "./email";

// Domain logic for public event registration — shared by the register server
// action, the success page, and the Stripe webhook. All finalization is
// idempotent so it is safe to call from more than one place.

export interface CouponResult {
  id: string;
  code: string;
  discountCents: number;
}

/** Validate a coupon and return the discount for a given ticket price. */
export async function resolveCoupon(
  eventId: string,
  code: string | null | undefined,
  priceCents: number
): Promise<CouponResult | null> {
  if (!code) return null;
  const coupon = await db.coupon.findFirst({
    where: { eventId, code: code.trim().toUpperCase(), isActive: true },
  });
  if (!coupon) return null;
  if (coupon.maxRedemptions && coupon.redemptions >= coupon.maxRedemptions) return null;
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return null;

  let discount = 0;
  if (coupon.percentOff) discount = Math.round((priceCents * coupon.percentOff) / 100);
  if (coupon.amountOffCents) discount += coupon.amountOffCents;
  discount = Math.min(discount, priceCents);
  return { id: coupon.id, code: coupon.code, discountCents: discount };
}

/** True if a completed registration already exists for this email + event.
 *  Only CONFIRMED/CHECKED_IN count — abandoned PENDING checkouts don't block a retry. */
export async function alreadyRegistered(eventId: string, email: string) {
  const existing = await db.registration.findFirst({
    where: { eventId, email: email.toLowerCase(), status: { in: ["CONFIRMED", "CHECKED_IN"] } },
  });
  return Boolean(existing);
}

async function ensureParticipant(registrationId: string, eventId: string, name: string, email: string) {
  const existing = await db.participant.findUnique({ where: { registrationId } });
  if (existing) return;
  await db.participant.create({
    data: {
      eventId,
      registrationId,
      name,
      email: email.toLowerCase(),
      visibility: "PUBLIC",
    },
  });
}

/** Register for a free ticket immediately. Returns the registration id. */
export async function registerFree(args: {
  eventId: string;
  eventName: string;
  ticketId: string;
  requiresApproval: boolean;
  firstName: string;
  lastName: string;
  email: string;
  answers?: Record<string, string>;
}) {
  const status = args.requiresApproval ? "PENDING" : "CONFIRMED";
  const reg = await db.registration.create({
    data: {
      eventId: args.eventId,
      ticketId: args.ticketId,
      email: args.email.toLowerCase(),
      firstName: args.firstName,
      lastName: args.lastName,
      status,
      answers: JSON.stringify(args.answers ?? {}),
    },
  });
  await db.ticket.update({ where: { id: args.ticketId }, data: { sold: { increment: 1 } } }).catch(() => {});
  if (status === "CONFIRMED") {
    await ensureParticipant(reg.id, args.eventId, `${args.firstName} ${args.lastName}`, args.email);
  }
  const tpl = EMAIL_TEMPLATES.registrationConfirmation(args.firstName, args.eventName);
  await sendEmail({ to: args.email, subject: tpl.subject, text: tpl.text });
  return reg.id;
}

/**
 * Create a PENDING order + registration for a paid ticket.
 * Returns identifiers used to build the Stripe Checkout session.
 */
export async function startPaidRegistration(args: {
  eventId: string;
  ticketId: string;
  firstName: string;
  lastName: string;
  email: string;
  priceCents: number;
  currency: string;
  coupon: CouponResult | null;
  answers?: Record<string, string>;
}) {
  const subtotal = args.priceCents;
  const discount = args.coupon?.discountCents ?? 0;
  const total = Math.max(0, subtotal - discount);

  const order = await db.order.create({
    data: {
      eventId: args.eventId,
      email: args.email.toLowerCase(),
      subtotalCents: subtotal,
      discountCents: discount,
      totalCents: total,
      currency: args.currency,
      status: "PENDING",
    },
  });
  await db.registration.create({
    data: {
      eventId: args.eventId,
      ticketId: args.ticketId,
      orderId: order.id,
      email: args.email.toLowerCase(),
      firstName: args.firstName,
      lastName: args.lastName,
      status: "PENDING",
      answers: JSON.stringify(args.answers ?? {}),
    },
  });
  if (args.coupon) {
    await db.coupon.update({ where: { id: args.coupon.id }, data: { redemptions: { increment: 1 } } }).catch(() => {});
  }
  return { orderId: order.id, totalCents: total };
}

/**
 * Finalize a paid order: mark it PAID, record the payment, confirm its
 * registrations, bump ticket sold counts, create participants, and send the
 * confirmation email. Idempotent — a second call is a no-op.
 */
export async function finalizeOrder(orderId: string, providerRef = "mock"): Promise<boolean> {
  // The status guard makes this atomic + idempotent: only the first caller
  // that flips PENDING → PAID proceeds.
  const flipped = await db.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "PAID" },
  });
  if (flipped.count === 0) return false;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { registrations: true, event: true },
  });
  if (!order) return false;

  await db.payment
    .create({ data: { orderId, amountCents: order.totalCents, status: "SUCCEEDED", providerRef } })
    .catch(() => {});

  for (const reg of order.registrations) {
    await db.registration.update({ where: { id: reg.id }, data: { status: "CONFIRMED" } });
    if (reg.ticketId) {
      await db.ticket.update({ where: { id: reg.ticketId }, data: { sold: { increment: 1 } } }).catch(() => {});
    }
    await ensureParticipant(reg.id, order.eventId, `${reg.firstName} ${reg.lastName}`, reg.email);
    const tpl = EMAIL_TEMPLATES.registrationConfirmation(reg.firstName, order.event.name);
    await sendEmail({ to: reg.email, subject: tpl.subject, text: tpl.text });
  }
  return true;
}

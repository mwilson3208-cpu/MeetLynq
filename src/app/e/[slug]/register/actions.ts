"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  registerFree,
  registerWaitlist,
  startPaidRegistration,
  resolveCoupon,
  alreadyRegistered,
  alreadyWaitlisted,
  countActiveRegistrations,
  isAtCapacity,
} from "@/lib/registration";
import { createCheckout, appUrl } from "@/lib/stripe";

export type RegisterState = { error?: string; success?: string } | null;

// Basic email sanity — this is a public endpoint, so don't trust the browser's
// type="email" guard (a direct POST bypasses it). Not a full RFC validator; it
// catches obvious junk without rejecting legitimate addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 100;
const MAX_EMAIL = 254;

export async function registerForEvent(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const slug = String(formData.get("slug") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim().slice(0, MAX_NAME);
  const lastName = String(formData.get("lastName") ?? "").trim().slice(0, MAX_NAME);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, MAX_EMAIL);
  const couponCode = String(formData.get("coupon") ?? "").trim().slice(0, 64) || null;

  if (!firstName || !lastName || !email) return { error: "Please fill in your name and email." };
  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };
  if (!ticketId) return { error: "Please choose a ticket." };

  const event = await db.event.findUnique({ where: { slug } });
  if (!event) return { error: "Event not found." };
  if (event.status === "DRAFT") return { error: "Registration isn't open yet." };

  const ticket = await db.ticket.findFirst({ where: { id: ticketId, eventId: event.id, isActive: true } });
  if (!ticket) return { error: "That ticket is no longer available." };

  if (ticket.quantity !== null && ticket.sold >= ticket.quantity) {
    return { error: `${ticket.name} is sold out.` };
  }
  if (await alreadyRegistered(event.id, email)) {
    return { error: "You're already registered for this event with that email." };
  }

  // Waitlist: when the organizer has enabled it and the event has reached its
  // capacity, new sign-ups join the waitlist instead of registering — for both
  // free and paid tickets (nobody is charged to wait).
  if (event.waitlistEnabled && event.capacity != null) {
    const activeCount = await countActiveRegistrations(event.id);
    if (isAtCapacity(activeCount, event.capacity)) {
      if (await alreadyWaitlisted(event.id, email)) {
        return { error: "You're already on the waitlist for this event with that email." };
      }
      try {
        await registerWaitlist({
          eventId: event.id,
          eventName: event.name,
          ticketId: ticket.id,
          firstName,
          lastName,
          email,
        });
      } catch (err) {
        console.error("[register:waitlist]", err);
        return { error: "We couldn't add you to the waitlist right now. Please try again in a moment." };
      }
      redirect(`/e/${slug}/registered?waitlist=1`);
    }
  }

  // Approval is required when either the ticket or the event-level
  // "Manual approval" setting asks for it.
  const requiresApproval = ticket.requiresApproval || event.requireApproval;

  // Free ticket → register immediately, then show confirmation.
  if (ticket.priceCents <= 0) {
    try {
      await registerFree({
        eventId: event.id,
        eventName: event.name,
        ticketId: ticket.id,
        requiresApproval,
        firstName,
        lastName,
        email,
      });
    } catch (err) {
      console.error("[register:free]", err);
      return { error: "We couldn't complete your registration right now. Please try again in a moment." };
    }
    redirect(`/e/${slug}/registered?free=1${requiresApproval ? "&approval=1" : ""}`);
  }

  // Paid ticket → create a pending order and go to checkout.
  let checkoutUrl: string;
  try {
    const effectivePrice = ticket.earlyBird && ticket.earlyBirdPriceCents ? ticket.earlyBirdPriceCents : ticket.priceCents;
    const coupon = await resolveCoupon(event.id, couponCode, effectivePrice);
    const { orderId } = await startPaidRegistration({
      eventId: event.id,
      ticketId: ticket.id,
      firstName,
      lastName,
      email,
      priceCents: effectivePrice,
      currency: ticket.currency,
      coupon,
    });

    const successUrl = `${appUrl()}/e/${slug}/registered?order=${orderId}`;
    const cancelUrl = `${appUrl()}/e/${slug}?canceled=1#register`;
    checkoutUrl = await createCheckout({
      orderId,
      email,
      ticketName: ticket.name,
      amountCents: coupon ? Math.max(0, effectivePrice - coupon.discountCents) : effectivePrice,
      currency: ticket.currency,
      successUrl,
      cancelUrl,
    });
  } catch (err) {
    // Covers the payment provider being unreachable as well as database
    // hiccups — nothing has been charged; the attendee can simply retry.
    console.error("[register:paid]", err);
    return { error: "We couldn't start checkout. You haven't been charged — please try again." };
  }

  redirect(checkoutUrl);
}

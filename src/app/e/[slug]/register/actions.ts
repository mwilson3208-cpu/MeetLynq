"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  registerFree,
  startPaidRegistration,
  resolveCoupon,
  alreadyRegistered,
} from "@/lib/registration";
import { createCheckout, appUrl } from "@/lib/stripe";

export type RegisterState = { error?: string; success?: string } | null;

export async function registerForEvent(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const slug = String(formData.get("slug") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const couponCode = String(formData.get("coupon") ?? "").trim() || null;

  if (!firstName || !lastName || !email) return { error: "Please fill in your name and email." };
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

  // Free ticket → register immediately, then show confirmation.
  if (ticket.priceCents <= 0) {
    await registerFree({
      eventId: event.id,
      eventName: event.name,
      ticketId: ticket.id,
      requiresApproval: ticket.requiresApproval,
      firstName,
      lastName,
      email,
    });
    redirect(`/e/${slug}/registered?free=1${ticket.requiresApproval ? "&approval=1" : ""}`);
  }

  // Paid ticket → create a pending order and go to checkout.
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
  const checkoutUrl = await createCheckout({
    orderId,
    email,
    ticketName: ticket.name,
    amountCents: coupon ? Math.max(0, effectivePrice - coupon.discountCents) : effectivePrice,
    currency: ticket.currency,
    successUrl,
    cancelUrl,
  });

  redirect(checkoutUrl);
}

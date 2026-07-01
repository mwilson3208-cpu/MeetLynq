import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { constructWebhookEvent, isStripeConfigured } from "@/lib/stripe";
import { finalizeOrder } from "@/lib/registration";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Stripe webhook receiver. Verifies the signature with STRIPE_WEBHOOK_SECRET,
// then finalizes the matching order on successful payment (idempotent). In mock
// mode (no keys) the confirmation page finalizes instead, so this is a no-op.
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ received: true, mode: "mock" });
  }

  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  const event = constructWebhookEvent(payload, signature);
  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) await finalizeOrder(orderId, session.payment_intent?.toString() ?? "stripe");
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const orderId = charge.metadata?.orderId;
      if (orderId) {
        await db.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } }).catch(() => {});
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Stripe webhook receiver. In production, verify the signature with
// STRIPE_WEBHOOK_SECRET before trusting the payload. The mock-friendly handler
// below accepts a minimal shape so payment/refund flows can be exercised in dev.
export async function POST(req: Request) {
  let event: { type?: string; data?: { object?: { metadata?: { orderId?: string }; amount_refunded?: number } } };
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const orderId = event.data?.object?.metadata?.orderId;

  switch (event.type) {
    case "payment_intent.succeeded":
      if (orderId) {
        await db.order.update({ where: { id: orderId }, data: { status: "PAID" } }).catch(() => {});
      }
      break;
    case "charge.refunded":
      if (orderId) {
        await db.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } }).catch(() => {});
      }
      break;
    default:
      // Unhandled event types are acknowledged so Stripe stops retrying.
      break;
  }

  return NextResponse.json({ received: true });
}

import Stripe from "stripe";
import { headers } from "next/headers";

// Payments layer. Uses real Stripe Checkout when STRIPE_SECRET_KEY is set;
// otherwise runs in "mock" mode where checkout resolves immediately to the
// success URL so the registration flow is fully demoable without any keys.

const SECRET = process.env.STRIPE_SECRET_KEY;

export function isStripeConfigured() {
  return Boolean(SECRET);
}

let stripe: Stripe | null = null;
export function getStripe(): Stripe | null {
  if (!SECRET) return null;
  if (!stripe) stripe = new Stripe(SECRET);
  return stripe;
}

/**
 * Absolute origin for redirect/callback URLs (checkout success, cancel).
 * Resolution order:
 *   1. NEXT_PUBLIC_APP_URL — explicit override
 *   2. The incoming request's own host — always matches the domain the
 *      visitor is on (production domain or preview URL alike)
 *   3. Vercel's project/deployment domains
 *   4. localhost, for local dev outside a request
 * The old localhost-only fallback sent production checkouts to
 * http://localhost:3000 ("This site can't be reached").
 */
export async function appUrl(): Promise<string> {
  let explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) {
    // Repair a schemeless value ("meetlynk.app") instead of emitting invalid URLs.
    if (!/^https?:\/\//i.test(explicit)) explicit = `https://${explicit}`;
    return explicit;
  }
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const isLocal = host.startsWith("localhost") || host.startsWith("127.");
      const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // Outside a request scope — fall through to env-based resolution.
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export interface CheckoutParams {
  orderId: string;
  email: string;
  ticketName: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create a checkout session and return the URL to redirect the buyer to.
 * In mock mode (no key), returns the success URL directly — the success page
 * finalizes the order, so the demo completes end-to-end without Stripe.
 */
export async function createCheckout(params: CheckoutParams): Promise<string> {
  const client = getStripe();
  if (!client) return `${params.successUrl}&mock=1`;

  const session = await client.checkout.sessions.create({
    mode: "payment",
    customer_email: params.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: params.currency.toLowerCase(),
          unit_amount: params.amountCents,
          product_data: { name: params.ticketName },
        },
      },
    ],
    metadata: { orderId: params.orderId },
    payment_intent_data: { metadata: { orderId: params.orderId } },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });
  return session.url ?? params.cancelUrl;
}

/** Verify and parse a Stripe webhook payload. Returns null if unverifiable. */
export function constructWebhookEvent(payload: string, signature: string | null): Stripe.Event | null {
  const client = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!client || !secret || !signature) return null;
  try {
    return client.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return null;
  }
}

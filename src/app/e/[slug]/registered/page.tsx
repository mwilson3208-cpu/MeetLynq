import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, CalendarDays, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { finalizeOrder } from "@/lib/registration";
import { isStripeConfigured } from "@/lib/stripe";
import { LogoMark } from "@/components/brand/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RegisteredPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string; free?: string; mock?: string; approval?: string; waitlist?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const event = await db.event.findUnique({ where: { slug } });
  if (!event) notFound();

  const waitlisted = sp.waitlist === "1";
  const awaitingApproval = sp.approval === "1" && !waitlisted;
  const isFree = sp.free === "1" && !awaitingApproval && !waitlisted;
  let paid = false;
  let pending = false;

  if (sp.order) {
    // In mock mode (no Stripe) the success page is the finalizer. With real
    // Stripe, the webhook is the source of truth — here we only read status.
    if (!isStripeConfigured()) {
      await finalizeOrder(sp.order, "mock");
    }
    const order = await db.order.findUnique({ where: { id: sp.order } });
    paid = order?.status === "PAID";
    pending = order?.status === "PENDING";
  }

  const confirmed = isFree || paid;

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center gap-2">
          <LogoMark />
          <span className="font-semibold">{event.name}</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <div
              className={`mx-auto flex size-14 items-center justify-center rounded-full ${
                confirmed ? "bg-success/12 text-success" : "bg-warning/15 text-warning-foreground"
              }`}
            >
              {confirmed ? <CheckCircle2 className="size-7" /> : <Clock className="size-7" />}
            </div>

            <h1 className="mt-5 text-2xl font-bold tracking-tight">
              {confirmed
                ? "You're registered!"
                : waitlisted
                  ? "You're on the waitlist"
                  : awaitingApproval
                    ? "Request received!"
                    : "Almost there…"}
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
              {waitlisted
                ? `${event.name} is currently at capacity, so we've added you to the waitlist. We'll email you as soon as a spot opens up.`
                : awaitingApproval
                ? `Your registration for ${event.name} is awaiting organizer approval. We'll email you as soon as it's confirmed.`
                : isFree
                  ? `Your spot at ${event.name} is confirmed. We've emailed your ticket and event details.`
                  : paid
                    ? `Payment confirmed — your spot at ${event.name} is booked. Check your email for your ticket and receipt.`
                    : pending
                      ? "We've received your payment and are confirming your spot. This can take a few moments — your confirmation email is on the way."
                      : `Thanks for registering for ${event.name}.`}
            </p>

            <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
              <CalendarDays className="size-4 text-muted-foreground" />
              <span className="font-medium">{event.name}</span>
              <span className="text-muted-foreground">· {formatDate(event.startsAt)}</span>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <ButtonLink href={`/e/${slug}`} variant="outline">
                Back to event
              </ButtonLink>
              <Link href="/portal">
                <Button className="w-full sm:w-auto">
                  Open attendee portal <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Powered by MeetLynq · Meet smarter. Connect faster. Measure what matters.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

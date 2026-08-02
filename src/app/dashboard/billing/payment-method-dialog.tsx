"use client";

import * as React from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function PaymentMethodDialog({ stripeConfigured }: { stripeConfigured: boolean }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        Update payment method
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Payment method"
        description="How billing works in this workspace right now."
      >
        <div className="space-y-3 text-sm">
          {stripeConfigured ? (
            <p className="text-muted-foreground">
              Card management is handled securely by Stripe. Use the Stripe customer portal link
              in your billing emails, or contact support to update the card on file.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                Billing runs in <span className="font-medium text-foreground">mock mode</span> —
                no real charges are made, and plan changes apply instantly. The card shown is
                sample data.
              </p>
              <p className="text-muted-foreground">
                To enable real payments, set <code className="rounded bg-secondary px-1">STRIPE_SECRET_KEY</code>{" "}
                and <code className="rounded bg-secondary px-1">STRIPE_WEBHOOK_SECRET</code> in your
                deployment environment.
              </p>
            </>
          )}
          <div className="flex items-center gap-2 rounded-lg border bg-secondary/30 p-3 text-xs text-muted-foreground">
            <CreditCard className="size-4 shrink-0" />
            Ticket sales use the same setting: with Stripe configured, buyers pay by card; without
            it, orders complete in mock checkout.
          </div>
        </div>
      </Dialog>
    </>
  );
}

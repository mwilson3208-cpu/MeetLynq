"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { withActionErrorFallback } from "@/components/ui/safe-action";
import { formatMoney } from "@/lib/utils";
import type { RegisterState } from "@/app/e/[slug]/register/actions";

export interface PublicTicket {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  earlyBird: boolean;
  earlyBirdPriceCents: number | null;
}

function priceOf(t: PublicTicket) {
  const cents = t.earlyBird && t.earlyBirdPriceCents ? t.earlyBirdPriceCents : t.priceCents;
  return cents > 0 ? formatMoney(cents, t.currency) : "Free";
}

function SubmitButton({ hasPaid }: { hasPaid: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Processing…" : hasPaid ? "Continue to checkout" : "Complete registration"}
    </Button>
  );
}

export function RegistrationForm({
  slug,
  tickets,
  action,
}: {
  slug: string;
  tickets: PublicTicket[];
  action: (prev: RegisterState, fd: FormData) => Promise<RegisterState>;
}) {
  const [state, formAction] = useActionState(withActionErrorFallback(action), null);
  const hasPaid = tickets.some((t) => (t.earlyBird && t.earlyBirdPriceCents ? t.earlyBirdPriceCents : t.priceCents) > 0);

  if (tickets.length === 0) {
    return <p className="text-sm text-muted-foreground">Tickets are not yet available for this event.</p>;
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name">
          <Input placeholder="Jordan" name="firstName" required />
        </Field>
        <Field label="Last name">
          <Input placeholder="Rivera" name="lastName" required />
        </Field>
      </div>
      <Field label="Email">
        <Input type="email" placeholder="you@company.com" name="email" required />
      </Field>
      <Field label="Ticket">
        <Select name="ticketId" defaultValue={tickets[0]?.id} required>
          {tickets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {priceOf(t)}
            </option>
          ))}
        </Select>
      </Field>
      {hasPaid && (
        <Field label="Coupon code" hint="Optional — applied to paid tickets at checkout.">
          <Input name="coupon" placeholder="EARLY25" />
        </Field>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton hasPaid={hasPaid} />
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" /> Secure checkout · GDPR & CCPA-ready
      </p>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { withActionErrorFallback } from "@/components/ui/safe-action";
import { formatMoney } from "@/lib/utils";
import { isChoiceType, fieldInputName, type FieldDTO } from "@/lib/registration-fields";
import type { RegisterState } from "@/app/e/[slug]/register/actions";

export interface PublicTicket {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  earlyBird: boolean;
  earlyBirdPriceCents: number | null;
}

function CustomFieldInput({ field }: { field: FieldDTO }) {
  const name = fieldInputName(field.id);
  if (field.type === "LONG_TEXT") {
    return <Textarea name={name} rows={3} required={field.required} />;
  }
  if (field.type === "SINGLE_CHOICE") {
    return (
      <Select name={name} required={field.required} defaultValue="">
        <option value="" disabled={field.required}>
          Select…
        </option>
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    );
  }
  if (field.type === "MULTI_CHOICE") {
    return (
      <div className="space-y-1.5">
        {field.options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={name} value={o} className="size-4 accent-[hsl(243_75%_59%)]" />
            {o}
          </label>
        ))}
      </div>
    );
  }
  const inputType = field.type === "EMAIL" ? "email" : field.type === "PHONE" ? "tel" : field.type === "NUMBER" ? "number" : "text";
  return <Input type={inputType} name={name} required={field.required} />;
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
  customFields = [],
}: {
  slug: string;
  tickets: PublicTicket[];
  action: (prev: RegisterState, fd: FormData) => Promise<RegisterState>;
  customFields?: FieldDTO[];
}) {
  const [state, formAction] = useActionState(withActionErrorFallback(action), null);
  const hasPaid = tickets.some((t) => (t.earlyBird && t.earlyBirdPriceCents ? t.earlyBirdPriceCents : t.priceCents) > 0);

  // Ticket choice is controlled so the "Select" buttons on the ticket cards
  // (links carrying ?ticket=<id>) can preselect it. Read client-side only, so
  // the statically cached page never depends on searchParams.
  const [ticketId, setTicketId] = useState(tickets[0]?.id ?? "");
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("ticket");
    if (fromUrl && tickets.some((t) => t.id === fromUrl)) setTicketId(fromUrl);
  }, [tickets]);

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
        <Select name="ticketId" value={ticketId} onChange={(e) => setTicketId(e.target.value)} required>
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

      {customFields.map((f) => (
        <Field key={f.id} label={f.required ? `${f.label} *` : f.label}>
          <CustomFieldInput field={f} />
        </Field>
      ))}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton hasPaid={hasPaid} />
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" /> Secure checkout · GDPR & CCPA-ready
      </p>
    </form>
  );
}

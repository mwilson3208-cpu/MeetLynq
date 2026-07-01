"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { EVENT_TYPES, EVENT_FORMATS } from "@/lib/constants";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Creating…" : "Create event"}
    </Button>
  );
}

export function CreateEventForm({
  action,
}: {
  action: (prev: unknown, fd: FormData) => Promise<{ error?: string } | void>;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-5">
      <Field label="Event name">
        <Input name="name" placeholder="e.g. GrowthScale Summit 2026" required />
      </Field>
      <Field label="Tagline" hint="One line that captures the value of attending.">
        <Textarea name="tagline" rows={2} placeholder="Where revenue leaders meet the people who move the needle." />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Event type">
          <Select name="type" defaultValue="CONFERENCE">
            {Object.entries(EVENT_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </Field>
        <Field label="Format">
          <Select name="format" defaultValue="IN_PERSON">
            {Object.entries(EVENT_FORMATS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="City">
          <Input name="city" placeholder="Austin, USA" />
        </Field>
        <Field label="Start date">
          <Input name="startsAt" type="date" />
        </Field>
      </div>
      <label className="flex items-start gap-3 rounded-lg border p-3">
        <input type="checkbox" name="useAi" defaultChecked className="mt-1 size-4 accent-[hsl(243_75%_59%)]" />
        <span className="text-sm">
          <span className="font-medium">Use the AI setup assistant</span>
          <span className="block text-muted-foreground">Draft an event description I can review and edit.</span>
        </span>
      </label>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Submit />
      </div>
    </form>
  );
}

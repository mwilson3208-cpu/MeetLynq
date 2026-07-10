"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select } from "@/components/ui/input";
import { createCampaign } from "./actions";

const SEGMENTS = [
  { value: "ALL", label: "All attendees" },
  { value: "REGISTERED", label: "Registered (confirmed)" },
  { value: "PENDING", label: "Pending" },
  { value: "CHECKED_IN", label: "Checked-in" },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Saving…" : "Save campaign"}
    </Button>
  );
}

export function Composer({ eventId }: { eventId: string }) {
  const [state, formAction] = useActionState(createCampaign, null);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <Field label="Campaign name" hint="Internal label. Defaults to the subject.">
        <Input name="name" placeholder="Week-of reminder" />
      </Field>
      <Field label="Subject">
        <Input name="subject" placeholder="e.g. Your schedule for the big day" required />
      </Field>
      <Field label="Segment">
        <Select name="segment" defaultValue="ALL">
          {SEGMENTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Body">
        <Textarea name="body" rows={5} placeholder="Write your message…" />
      </Field>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end">
        <Submit />
      </div>
    </form>
  );
}

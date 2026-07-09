"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { EVENT_TYPES, EVENT_FORMATS } from "@/lib/constants";

type State = { ok?: boolean; error?: string } | null;

export interface EventDefaults {
  id: string;
  name: string;
  tagline: string;
  description: string;
  type: string;
  format: string;
  startsAtLocal: string;
  endsAtLocal: string;
  timezone: string;
  venueName: string;
  venueAddress: string;
  city: string;
  country: string;
  capacity: string;
  brandColor: string;
  seoTitle: string;
  seoDescription: string;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export function EventSettingsForm({
  action,
  event,
}: {
  action: (prev: State, fd: FormData) => Promise<State>;
  event: EventDefaults;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="eventId" value={event.id} />
      <Field label="Event name">
        <Input name="name" defaultValue={event.name} required />
      </Field>
      <Field label="Tagline">
        <Textarea name="tagline" rows={2} defaultValue={event.tagline} />
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={4} defaultValue={event.description} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Type">
          <Select name="type" defaultValue={event.type}>
            {Object.entries(EVENT_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </Field>
        <Field label="Format">
          <Select name="format" defaultValue={event.format}>
            {Object.entries(EVENT_FORMATS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Starts">
          <Input name="startsAt" type="datetime-local" defaultValue={event.startsAtLocal} />
        </Field>
        <Field label="Ends">
          <Input name="endsAt" type="datetime-local" defaultValue={event.endsAtLocal} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Timezone">
          <Input name="timezone" defaultValue={event.timezone} placeholder="America/Chicago" />
        </Field>
        <Field label="Capacity">
          <Input name="capacity" type="number" min="0" defaultValue={event.capacity} placeholder="600" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Venue name">
          <Input name="venueName" defaultValue={event.venueName} />
        </Field>
        <Field label="Venue address">
          <Input name="venueAddress" defaultValue={event.venueAddress} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="City">
          <Input name="city" defaultValue={event.city} />
        </Field>
        <Field label="Country">
          <Input name="country" defaultValue={event.country} />
        </Field>
        <Field label="Brand color">
          <Input name="brandColor" type="color" defaultValue={event.brandColor || "#4f46e5"} className="h-10 p-1" />
        </Field>
      </div>

      <Field label="SEO title">
        <Input name="seoTitle" defaultValue={event.seoTitle} />
      </Field>
      <Field label="SEO description">
        <Textarea name="seoDescription" rows={2} defaultValue={event.seoDescription} />
      </Field>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex items-center justify-end gap-3">
        {state?.ok && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <Check className="size-4" /> Saved
          </span>
        )}
        <SaveButton />
      </div>
    </form>
  );
}

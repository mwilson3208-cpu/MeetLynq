"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { withActionErrorFallback } from "@/components/ui/safe-action";

type MutationState = { ok?: boolean; error?: string } | null;
type Action = (prev: MutationState, fd: FormData) => Promise<MutationState>;

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>;
}

export function SpeakerProfileForm({
  action,
  speakerId,
  defaults,
}: {
  action: Action;
  speakerId: string;
  defaults: { title: string; bio: string; sessionDescription: string };
}) {
  const safeAction = React.useMemo(() => withActionErrorFallback(action), [action]);
  const [state, formAction] = useActionState(safeAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="speakerId" value={speakerId} />
      <Field label="Title">
        <Input name="title" defaultValue={defaults.title} maxLength={120} />
      </Field>
      <Field label="Bio">
        <Textarea name="bio" defaultValue={defaults.bio} rows={4} maxLength={2000} />
      </Field>
      <Field label="Session description">
        <Textarea name="sessionDescription" defaultValue={defaults.sessionDescription} rows={3} maxLength={2000} />
      </Field>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex items-center justify-end gap-3">
        {state?.ok && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <Check className="size-4" /> Saved
          </span>
        )}
        <SubmitBtn />
      </div>
    </form>
  );
}

"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/input";
import { withActionErrorFallback } from "@/components/ui/safe-action";

type MutationState = { ok?: boolean; error?: string } | null;
type Action = (prev: MutationState, fd: FormData) => Promise<MutationState>;

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Sending…" : "Send message"}
    </Button>
  );
}

/**
 * "Contact" a poster: starts a private conversation (with an opening message)
 * between a chosen participant and the post author. The thread then lives on
 * the Conversations page.
 */
export function ContactButton({
  eventId,
  target,
  others,
  action,
}: {
  eventId: string;
  target: { id: string; name: string };
  others: { id: string; name: string }[];
  action: Action;
}) {
  const [open, setOpen] = React.useState(false);
  const safeAction = React.useMemo(() => withActionErrorFallback(action), [action]);
  const [state, formAction] = useActionState(safeAction, null);

  React.useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <>
      <Button variant="outline" size="sm" className="flex-1" onClick={() => setOpen(true)}>
        Contact
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Message ${target.name}`}
        description="Starts a private thread — find it on the Conversations page."
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="participantBId" value={target.id} />
          <Field label="From">
            <Select name="participantAId" required defaultValue="">
              <option value="" disabled>
                Select a participant…
              </option>
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Message">
            <Textarea name="message" rows={3} required placeholder={`Hi ${target.name.split(" ")[0]}, saw your post…`} />
          </Field>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex justify-end">
            <SubmitBtn />
          </div>
        </form>
      </Dialog>
    </>
  );
}

"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export type MutationState = { ok?: boolean; error?: string } | null;
type Action = (prev: MutationState, fd: FormData) => Promise<MutationState>;

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

/**
 * A button that opens a modal with a form wired to a server action.
 * Closes automatically when the action returns { ok: true } (the action is
 * expected to revalidate the page, so fresh data appears underneath).
 */
export function FormDialog({
  buttonLabel,
  title,
  description,
  action,
  submitLabel = "Save",
  buttonSize = "md",
  children,
}: {
  buttonLabel: string;
  title: string;
  description?: string;
  action: Action;
  submitLabel?: string;
  buttonSize?: "sm" | "md" | "lg";
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState(action, null);

  React.useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <>
      <Button size={buttonSize} onClick={() => setOpen(true)}>
        <Plus className="size-4" /> {buttonLabel}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description}>
        <form action={formAction} className="space-y-4">
          {children}
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitBtn label={submitLabel} />
          </div>
        </form>
      </Dialog>
    </>
  );
}

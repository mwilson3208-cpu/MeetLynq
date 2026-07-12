"use client";

import { Trash2 } from "lucide-react";

/** Small delete control: a confirm dialog then a POST to a server action. */
export function DeleteButton({
  action,
  id,
  eventId,
  confirmText = "Delete this item? This can't be undone.",
  label,
  redirectTo,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  eventId: string;
  confirmText?: string;
  label?: string;
  /** Dashboard path to return to after the delete (defaults to the action's own). */
  redirectTo?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="eventId" value={eventId} />
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label="Delete"
      >
        <Trash2 className="size-4" />
        {label}
      </button>
    </form>
  );
}

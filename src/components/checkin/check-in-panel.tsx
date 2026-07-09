"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { UserCheck, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CheckInState } from "@/app/dashboard/events/[id]/check-in/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="success" className="w-full" disabled={pending}>
      <UserCheck /> {pending ? "Checking in…" : "Check in"}
    </Button>
  );
}

export function CheckInPanel({
  action,
  eventId,
}: {
  action: (prev: CheckInState, fd: FormData) => Promise<CheckInState>;
  eventId: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear + refocus after each attempt so the next scan/entry is fast.
  useEffect(() => {
    if (state) {
      if (inputRef.current) inputRef.current.value = "";
      inputRef.current?.focus();
    }
  }, [state]);

  return (
    <div className="space-y-3">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="eventId" value={eventId} />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            name="query"
            autoFocus
            autoComplete="off"
            placeholder="Scan a QR code, or search by name or email…"
            className="pl-9"
          />
        </div>
        <SubmitButton />
      </form>

      {state?.ok && (
        <div className="flex items-center gap-2 rounded-lg bg-success/12 px-3 py-2.5 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>
            <strong>{state.name}</strong> {state.already ? "was already checked in." : "is checked in ✓"}
          </span>
        </div>
      )}
      {state?.error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/12 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
    </div>
  );
}

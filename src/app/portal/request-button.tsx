"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { withActionErrorFallback } from "@/components/ui/safe-action";

type MutationState = { ok?: boolean; error?: string } | null;
type Action = (prev: MutationState, fd: FormData) => Promise<MutationState>;

function SubmitBtn({ done }: { done: boolean }) {
  const { pending } = useFormStatus();
  if (done) {
    return (
      <Button variant="success" size="sm" className="mt-2" disabled>
        <Check className="size-4" /> Requested
      </Button>
    );
  }
  return (
    <Button type="submit" variant="outline" size="sm" className="mt-2" disabled={pending}>
      {pending ? "Requesting…" : "Request meeting"}
    </Button>
  );
}

export function RequestMatchButton({
  meId,
  targetId,
  action,
}: {
  meId: string;
  targetId: string;
  action: Action;
}) {
  const safeAction = React.useMemo(() => withActionErrorFallback(action), [action]);
  const [state, formAction] = useActionState(safeAction, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="meId" value={meId} />
      <input type="hidden" name="targetId" value={targetId} />
      <SubmitBtn done={Boolean(state?.ok)} />
      {state?.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

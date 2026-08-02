"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { withActionErrorFallback } from "@/components/ui/safe-action";

type MutationState = { ok?: boolean; error?: string } | null;
type Action = (prev: MutationState, fd: FormData) => Promise<MutationState>;

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      <UserPlus className="size-4" /> {pending ? "Adding…" : "Send invite"}
    </Button>
  );
}

export function InviteForm({ action }: { action: Action }) {
  const safeAction = React.useMemo(() => withActionErrorFallback(action), [action]);
  const [state, formAction] = useActionState(safeAction, null);
  const ref = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <Field label="Email address">
        <Input name="email" type="email" required placeholder="teammate@company.com" />
      </Field>
      <Field label="Role" hint="You can change this later.">
        <Select name="role" defaultValue="TEAM_MEMBER">
          <option value="ADMIN">Admin</option>
          <option value="TEAM_MEMBER">Team member</option>
          <option value="STAFF">Check-in staff</option>
        </Select>
      </Field>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <Check className="size-4" /> Teammate added to the workspace.
        </p>
      )}
      <SubmitBtn />
    </form>
  );
}

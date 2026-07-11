"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { withActionErrorFallback } from "@/components/ui/safe-action";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Please wait…" : label}
    </Button>
  );
}

type Action = (prev: unknown, fd: FormData) => Promise<{ error?: string } | void>;

export function LoginForm({ action, demoAction }: { action: Action; demoAction: () => Promise<void> }) {
  const [state, formAction] = useActionState(withActionErrorFallback(action), null);
  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <Field label="Work email">
          <Input name="email" type="email" placeholder="you@company.com" required defaultValue="organizer@meetlynq.com" />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" placeholder="••••••••" required defaultValue="password123" />
        </Field>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Submit label="Sign in" />
      </form>
      <form action={demoAction}>
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Try the live demo workspace
        </Button>
      </form>
    </div>
  );
}

export function SignupForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(withActionErrorFallback(action), null);
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Your name">
        <Input name="name" placeholder="Jordan Lee" required />
      </Field>
      <Field label="Organization">
        <Input name="organization" placeholder="Acme Events" />
      </Field>
      <Field label="Work email">
        <Input name="email" type="email" placeholder="you@company.com" required />
      </Field>
      <Field label="Password" hint="At least 6 characters.">
        <Input name="password" type="password" placeholder="••••••••" required />
      </Field>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Submit label="Create account" />
    </form>
  );
}

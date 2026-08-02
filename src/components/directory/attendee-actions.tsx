"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, Separator } from "@/components/ui/misc";
import { Field, Select, Input } from "@/components/ui/input";
import { withActionErrorFallback } from "@/components/ui/safe-action";

export type AttendeeProfile = {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
  industry: string | null;
  location: string | null;
  bio: string | null;
  goals: string | null;
  lookingFor: string | null;
  offering: string | null;
  tags: string[];
  intentScore: number;
};

type MutationState = { ok?: boolean; error?: string } | null;
type Action = (prev: MutationState, fd: FormData) => Promise<MutationState>;

export function ViewProfileButton({ profile }: { profile: AttendeeProfile }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="flex-1" onClick={() => setOpen(true)}>
        View profile
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={profile.name}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={profile.name} size={48} />
            <div className="min-w-0">
              {(profile.title || profile.companyName) && (
                <p className="text-sm font-medium">
                  {[profile.title, profile.companyName].filter(Boolean).join(" @ ")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {[profile.industry, profile.location].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            <Badge tone={profile.intentScore > 70 ? "success" : "neutral"} className="ml-auto shrink-0">
              Intent {profile.intentScore}
            </Badge>
          </div>
          {profile.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.tags.map((t) => (
                <Badge key={t} tone="primary">{t}</Badge>
              ))}
            </div>
          )}
          {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
          <Separator />
          <dl className="space-y-2 text-sm">
            {profile.goals && (
              <div>
                <dt className="font-medium">Goals</dt>
                <dd className="text-muted-foreground">{profile.goals}</dd>
              </div>
            )}
            {profile.lookingFor && (
              <div>
                <dt className="font-medium">Looking for</dt>
                <dd className="text-muted-foreground">{profile.lookingFor}</dd>
              </div>
            )}
            {profile.offering && (
              <div>
                <dt className="font-medium">Offering</dt>
                <dd className="text-muted-foreground">{profile.offering}</dd>
              </div>
            )}
          </dl>
        </div>
      </Dialog>
    </>
  );
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Sending…" : label}
    </Button>
  );
}

/**
 * "Request meeting" for a specific attendee: pick who the meeting is with,
 * add an optional goal, submit → creates a REQUESTED meeting.
 */
export function RequestMeetingButton({
  eventId,
  target,
  others,
  action,
  buttonVariant = "primary",
  buttonLabel = "Request meeting",
  className = "flex-1",
}: {
  eventId: string;
  target: { id: string; name: string };
  others: { id: string; name: string }[];
  action: Action;
  buttonVariant?: "primary" | "outline";
  buttonLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const safeAction = React.useMemo(() => withActionErrorFallback(action), [action]);
  const [state, formAction] = useActionState(safeAction, null);

  React.useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <>
      <Button variant={buttonVariant} size="sm" className={className} onClick={() => setOpen(true)}>
        {buttonLabel}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Request a meeting with ${target.name}`}
        description="The request appears under Meetings with status Requested."
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="participantBId" value={target.id} />
          <Field label="On behalf of">
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
          <Field label="Mode">
            <Select name="mode" defaultValue="IN_PERSON">
              <option value="IN_PERSON">In-person</option>
              <option value="ONLINE">Online</option>
            </Select>
          </Field>
          <Field label="Goal">
            <Input name="goal" placeholder="Explore partnership" />
          </Field>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex justify-end">
            <SubmitBtn label="Send request" />
          </div>
        </form>
      </Dialog>
    </>
  );
}

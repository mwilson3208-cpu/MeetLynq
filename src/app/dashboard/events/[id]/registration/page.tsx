import {
  Users,
  UserCheck,
  Sparkles,
  ExternalLink,
  Check,
  Lock,
  Plus,
} from "lucide-react";
import { getEventOr404, getEventStats } from "@/lib/queries";
import { StatCard } from "@/components/ui/misc";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { pct } from "@/lib/utils";
import { generate } from "@/lib/ai";
import { db } from "@/lib/db";
import { parseOptions, type FieldDTO } from "@/lib/registration-fields";
import { SettingToggle } from "./setting-toggle";
import { FieldBuilder } from "./field-builder";
import {
  setRegistrationSetting,
  addRegistrationField,
  deleteRegistrationField,
  setFieldRequired,
  reorderRegistrationFields,
} from "./actions";
import type { RegistrationSettingKey } from "./settings";

// The core identity fields always live on the registration form and map to real
// Registration columns, so they're locked (not editable/removable here).
const SYSTEM_FIELDS = [
  { label: "First name", type: "Text" },
  { label: "Last name", type: "Text" },
  { label: "Email address", type: "Email" },
];

const SETTINGS: { key: RegistrationSettingKey; title: string; desc: string }[] = [
  {
    key: "requireApproval",
    title: "Manual approval",
    desc: "Review each registration before confirming a spot.",
  },
  {
    key: "waitlistEnabled",
    title: "Waitlist",
    desc: "Collect sign-ups once capacity is reached.",
  },
  {
    key: "conditionalFields",
    title: "Conditional fields",
    desc: "Show questions based on previous answers.",
  },
  {
    key: "groupRegistration",
    title: "Group registration",
    desc: "Let one buyer register multiple attendees.",
  },
];

export default async function RegistrationSetup({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventOr404(id);
  const stats = await getEventStats(id);
  const suggestion = await generate("registration_questions", { name: event.name });
  const conversion = pct(stats.checkedIn, stats.registrations);

  const fieldRows = await db.registrationField.findMany({
    where: { eventId: event.id },
    orderBy: { order: "asc" },
  });
  const fields: FieldDTO[] = fieldRows.map((r) => ({
    id: r.id,
    label: r.label,
    type: r.type,
    required: r.required,
    options: parseOptions(r.options),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Registration setup</h2>
          <p className="text-sm text-muted-foreground">
            Configure the public registration form and approval flow.
          </p>
        </div>
        <ButtonLink href={`/e/${event.slug}`} variant="primary">
          <ExternalLink /> Open public registration
        </ButtonLink>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Registrations" value={stats.registrations} icon={<Users />} />
        <StatCard
          label="Checked in"
          value={stats.checkedIn}
          icon={<UserCheck />}
          tone="success"
          hint={`${conversion}% of registrations`}
        />
        <StatCard
          label="Form fields"
          value={`${SYSTEM_FIELDS.length + fields.length} fields`}
          icon={<Check />}
          tone="info"
          hint={`${fields.length} custom ${fields.length === 1 ? "question" : "questions"}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Registration form fields</CardTitle>
            <CardDescription>
              Default fields plus your custom registration questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Default fields
              </p>
              <ul className="space-y-2">
                {SYSTEM_FIELDS.map((f) => (
                  <li
                    key={f.label}
                    className="flex items-center justify-between rounded-lg border bg-secondary/30 p-3"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium">
                      <Lock className="size-3.5 text-muted-foreground" />
                      {f.label}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone="neutral">{f.type}</Badge>
                      <Badge tone="primary">Required</Badge>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                These identity fields are always collected and can&apos;t be removed.
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Custom questions
              </p>
              <FieldBuilder
                eventId={event.id}
                initial={fields}
                addAction={addRegistrationField}
                deleteAction={deleteRegistrationField}
                requiredAction={setFieldRequired}
                reorderAction={reorderRegistrationFields}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Control how registrations are handled.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {SETTINGS.map((s) => (
              <SettingToggle
                key={s.key}
                eventId={event.id}
                settingKey={s.key}
                title={s.title}
                desc={s.desc}
                initial={event[s.key]}
                action={setRegistrationSetting}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> AI suggested questions
          </CardTitle>
          <CardDescription>
            Generated for {event.name}. Review and add the ones that fit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-lg border bg-secondary/40 p-4 text-sm leading-relaxed text-foreground">
            {suggestion.output}
          </pre>
        </CardContent>
        <CardFooter>
          <Button variant="secondary" size="sm">
            <Plus /> Add all suggestions
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

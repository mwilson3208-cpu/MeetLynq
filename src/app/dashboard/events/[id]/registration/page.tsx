import {
  Users,
  UserCheck,
  Sparkles,
  ExternalLink,
  Check,
  GripVertical,
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

const DEFAULT_FIELDS = [
  { label: "First name", type: "Text", required: true },
  { label: "Last name", type: "Text", required: true },
  { label: "Email address", type: "Email", required: true },
  { label: "Company", type: "Text", required: false },
  { label: "Job title", type: "Text", required: false },
];

const CUSTOM_QUESTIONS = [
  { label: "What is your primary goal for attending?", type: "Long text", required: true },
  { label: "Which best describes your role?", type: "Single choice", required: true },
  { label: "What topics matter most to you?", type: "Multi choice", required: false },
];

const SETTINGS = [
  {
    title: "Manual approval",
    desc: "Review each registration before confirming a spot.",
    enabled: true,
  },
  {
    title: "Waitlist",
    desc: "Collect sign-ups once capacity is reached.",
    enabled: true,
  },
  {
    title: "Conditional fields",
    desc: "Show questions based on previous answers.",
    enabled: false,
  },
  {
    title: "Group registration",
    desc: "Let one buyer register multiple attendees.",
    enabled: false,
  },
];

function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors " +
        (enabled ? "bg-primary" : "bg-secondary")
      }
      aria-hidden
    >
      <span
        className={
          "inline-block size-5 transform rounded-full bg-white shadow transition-transform " +
          (enabled ? "translate-x-5" : "translate-x-0.5")
        }
      />
    </span>
  );
}

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
          label="Form completion"
          value={`${DEFAULT_FIELDS.length + CUSTOM_QUESTIONS.length} fields`}
          icon={<Check />}
          tone="info"
          hint={`${CUSTOM_QUESTIONS.length} custom questions`}
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
                {DEFAULT_FIELDS.map((f) => (
                  <li
                    key={f.label}
                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium">
                      <GripVertical className="size-4 text-muted-foreground" />
                      {f.label}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone="neutral">{f.type}</Badge>
                      {f.required && <Badge tone="primary">Required</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Custom questions
              </p>
              <ul className="space-y-2">
                {CUSTOM_QUESTIONS.map((f) => (
                  <li
                    key={f.label}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium">
                      <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                      {f.label}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge tone="info">{f.type}</Badge>
                      {f.required && <Badge tone="primary">Required</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm">
              <Plus /> Add custom question
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Control how registrations are handled.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {SETTINGS.map((s) => (
              <label
                key={s.title}
                className="flex cursor-pointer items-start justify-between gap-3 rounded-lg p-2.5 hover:bg-secondary/50"
              >
                <span>
                  <span className="block text-sm font-medium">{s.title}</span>
                  <span className="block text-xs text-muted-foreground">{s.desc}</span>
                </span>
                <Toggle enabled={s.enabled} />
              </label>
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

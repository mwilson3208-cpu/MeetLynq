import { ArrowUpRight, CalendarDays, Users, UserCog, CreditCard, Check } from "lucide-react";
import { requireOrg } from "@/lib/queries";
import { db } from "@/lib/db";
import { PageHeader, Progress } from "@/components/ui/misc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import type { Tone } from "@/lib/constants";
import { ORG_PLANS, labelOf } from "@/lib/constants";
import { formatMoney, formatDate, pct } from "@/lib/utils";

const PLAN_LIMITS: Record<string, { events: number; attendees: number; members: number; features: string[] }> = {
  STARTER: { events: 3, attendees: 500, members: 3, features: ["Up to 3 events", "500 attendees", "Core matchmaking", "Email support"] },
  GROWTH: { events: 15, attendees: 5000, members: 10, features: ["Up to 15 events", "5,000 attendees", "AI matchmaking", "Integrations", "Priority support"] },
  SCALE: { events: 50, attendees: 25000, members: 30, features: ["Up to 50 events", "25,000 attendees", "Advanced analytics", "SSO", "API access"] },
  ENTERPRISE: { events: 1000, attendees: 1000000, members: 1000, features: ["Unlimited events", "Unlimited attendees", "Dedicated success", "SLA", "Custom contracts"] },
};

const PLAN_TABLE: { key: string; price: string }[] = [
  { key: "STARTER", price: "$0" },
  { key: "GROWTH", price: "$99" },
  { key: "SCALE", price: "$299" },
  { key: "ENTERPRISE", price: "Custom" },
];

const INVOICES: { date: string; amount: number; status: string; tone: Tone }[] = [
  { date: "Jun 1, 2026", amount: 9900, status: "Paid", tone: "success" },
  { date: "May 1, 2026", amount: 9900, status: "Paid", tone: "success" },
  { date: "Apr 1, 2026", amount: 9900, status: "Paid", tone: "success" },
];

export default async function BillingPage() {
  const { org } = await requireOrg();

  const [eventCount, attendeeCount, memberCount] = await Promise.all([
    db.event.count({ where: { organizationId: org.id } }),
    db.registration.count({ where: { event: { organizationId: org.id } } }),
    db.organizationMember.count({ where: { organizationId: org.id } }),
  ]);

  const limits = PLAN_LIMITS[org.plan] ?? PLAN_LIMITS.STARTER;

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Manage your plan, usage, and payment details."
        action={
          <Button>
            <ArrowUpRight className="size-4" /> Upgrade plan
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardDescription>Current plan</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              {labelOf(ORG_PLANS, org.plan)}
              <Badge tone="primary">Active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {limits.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-success" /> {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-1">
          <UsageMeter label="Events" value={eventCount} limit={limits.events} icon={<CalendarDays className="size-4" />} />
          <UsageMeter label="Total attendees" value={attendeeCount} limit={limits.attendees} icon={<Users className="size-4" />} />
          <UsageMeter label="Team members" value={memberCount} limit={limits.members} icon={<UserCog className="size-4" />} />
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Compare plans</CardTitle>
          <CardDescription>Pricing is per workspace, billed monthly.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_TABLE.map((p) => {
              const current = p.key === org.plan;
              return (
                <div
                  key={p.key}
                  className={`rounded-xl border p-4 ${current ? "border-primary ring-1 ring-primary" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{labelOf(ORG_PLANS, p.key)}</p>
                    {current && <Badge tone="primary">Current</Badge>}
                  </div>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">
                    {p.price}
                    {p.price.startsWith("$") && p.price !== "$0" && (
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    )}
                  </p>
                  <Button
                    variant={current ? "outline" : "secondary"}
                    size="sm"
                    className="mt-4 w-full"
                    disabled={current}
                  >
                    {current ? "Your plan" : "Choose"}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Your recent billing history.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {INVOICES.map((inv) => (
                  <TR key={inv.date}>
                    <TD>{inv.date}</TD>
                    <TD className="font-medium">{formatMoney(inv.amount)}</TD>
                    <TD>
                      <Badge tone={inv.tone}>{inv.status}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-4 text-primary" /> Payment method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <CreditCard className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Visa •••• 4242</p>
                <p className="text-xs text-muted-foreground">Expires 04/28</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full">Update payment method</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UsageMeter({
  label,
  value,
  limit,
  icon,
}: {
  label: string;
  value: number;
  limit: number;
  icon: React.ReactNode;
}) {
  const percent = pct(value, limit);
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className="text-primary">{icon}</span> {label}
        </div>
        <span className="text-sm font-semibold">
          {value.toLocaleString()} <span className="text-muted-foreground">/ {limit.toLocaleString()}</span>
        </span>
      </div>
      <div className="mt-3">
        <Progress value={percent} />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{percent}% of plan limit used</p>
    </div>
  );
}

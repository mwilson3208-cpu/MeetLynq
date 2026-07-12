import Link from "next/link";
import {
  Users,
  UserCheck,
  CalendarClock,
  DollarSign,
  Building2,
  Presentation,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { getEventOr404, getEventStats } from "@/lib/queries";
import { db } from "@/lib/db";
import { StatCard } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import { formatMoney, pct } from "@/lib/utils";
import { REGISTRATION_STATUS } from "@/lib/constants";

export default async function EventOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventOr404(id);
  // Independent reads — run them concurrently instead of stacking round-trips.
  const [stats, statusBreakdown] = await Promise.all([
    getEventStats(id),
    db.registration.groupBy({
      by: ["status"],
      where: { eventId: id },
      _count: true,
    }),
  ]);

  const checkInRate = pct(stats.checkedIn, stats.registrations);
  const capacityFill = event.capacity ? pct(stats.registrations, event.capacity) : 0;

  const quickLinks = [
    { href: `builder`, label: "Edit event page", desc: "Branding, sections, SEO" },
    { href: `attendees`, label: "Manage attendees", desc: "Registered, pending, waitlisted" },
    { href: `matchmaking`, label: "Run matchmaking", desc: "AI-scored connections" },
    { href: `reports`, label: "View reports", desc: "Revenue, ROI, NPS" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registrations" value={stats.registrations} icon={<Users />} hint={event.capacity ? `${capacityFill}% of capacity` : undefined} />
        <StatCard label="Checked in" value={stats.checkedIn} icon={<UserCheck />} tone="success" hint={`${checkInRate}% check-in rate`} />
        <StatCard label="Meetings" value={stats.meetings} icon={<CalendarClock />} tone="info" />
        <StatCard label="Revenue" value={formatMoney(stats.revenueCents)} icon={<DollarSign />} tone="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Registration breakdown</CardTitle>
            <CardDescription>Live status across all registrations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.capacity && (
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">{stats.registrations} / {event.capacity}</span>
                </div>
                <Progress value={capacityFill} />
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {statusBreakdown.map((s) => {
                const meta = REGISTRATION_STATUS[s.status] ?? { label: s.status, tone: "neutral" as const };
                return (
                  <div key={s.status} className="flex items-center justify-between rounded-lg border p-3">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <span className="text-lg font-semibold">{s._count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Event at a glance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row icon={<Presentation className="size-4" />} label="Sessions" value={stats.sessions} />
            <Row icon={<Users className="size-4" />} label="Participants" value={stats.participants} />
            <Row icon={<Building2 className="size-4" />} label="Sponsors" value={stats.sponsors} />
            <Row icon={<Building2 className="size-4" />} label="Exhibitors" value={stats.exhibitors} />
            <Row icon={<CalendarClock className="size-4" />} label="Leads captured" value={stats.leads} />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((q) => (
            <Link key={q.href} href={`/dashboard/events/${id}/${q.href}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex items-start justify-between p-4">
                  <div>
                    <p className="font-medium">{q.label}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{q.desc}</p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon} {label}
      </span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

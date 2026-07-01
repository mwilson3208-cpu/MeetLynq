import {
  DollarSign,
  UserCheck,
  CalendarClock,
  UserX,
  Download,
  Send,
  Sparkles,
  Ticket as TicketIcon,
  Presentation,
  Building2,
} from "lucide-react";
import { getEventOr404, getEventStats } from "@/lib/queries";
import { db } from "@/lib/db";
import { generate } from "@/lib/ai";
import { StatCard, Progress, EmptyState } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatMoney, pct } from "@/lib/utils";

export default async function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventOr404(id);
  const stats = await getEventStats(id);

  const [noShowCount, meetingCount, tickets, sessions, sponsorCount, leadCount] = await Promise.all([
    db.meeting.count({ where: { eventId: id, noShow: true } }),
    db.meeting.count({ where: { eventId: id } }),
    db.ticket.findMany({ where: { eventId: id }, orderBy: { priceCents: "desc" } }),
    db.session.findMany({ where: { eventId: id }, orderBy: { startsAt: "asc" }, take: 5 }),
    db.sponsor.count({ where: { eventId: id } }),
    db.lead.count({ where: { eventId: id } }),
  ]);

  const noShowRate = pct(noShowCount, meetingCount);
  const checkInRate = pct(stats.checkedIn, stats.registrations);

  const [aiSummary, aiSponsorRoi] = await Promise.all([
    generate("post_event_summary", { name: event.name }),
    generate("sponsor_roi_summary", { name: event.name }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reports &amp; ROI</h2>
          <p className="text-sm text-muted-foreground">
            The full performance picture for {event.name}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline">
            <Download /> Export CRM-ready CSV
          </Button>
          <Button variant="primary">
            <Send /> Launch post-event campaign
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatMoney(stats.revenueCents)} icon={<DollarSign />} tone="warning" />
        <StatCard
          label="Check-in rate"
          value={`${checkInRate}%`}
          icon={<UserCheck />}
          tone="success"
          hint={`${stats.checkedIn} of ${stats.registrations} registered`}
        />
        <StatCard label="Meetings" value={stats.meetings} icon={<CalendarClock />} tone="info" />
        <StatCard
          label="No-show rate"
          value={`${noShowRate}%`}
          icon={<UserX />}
          hint={`${noShowCount} of ${meetingCount} meetings`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TicketIcon className="size-4 text-muted-foreground" /> Ticket sales
            </CardTitle>
            <CardDescription>Gross revenue by ticket type.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {tickets.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={<TicketIcon />} title="No ticket types" description="Create tickets to see sales here." />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Ticket</TH>
                    <TH>Sold</TH>
                    <TH>Gross</TH>
                  </TR>
                </THead>
                <TBody>
                  {tickets.map((t) => (
                    <TR key={t.id}>
                      <TD className="font-medium">{t.name}</TD>
                      <TD>{t.sold}</TD>
                      <TD>{formatMoney(t.sold * t.priceCents, t.currency)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Presentation className="size-4 text-muted-foreground" /> Top sessions
            </CardTitle>
            <CardDescription>Estimated attendance against capacity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessions.length === 0 ? (
              <EmptyState icon={<Presentation />} title="No sessions" description="Add sessions to your agenda to track attendance." />
            ) : (
              sessions.map((s) => {
                const cap = s.capacity ?? 100;
                // Derived (demo) attendance: a stable fraction of capacity.
                const attended = Math.round(cap * 0.78);
                const fill = pct(attended, cap);
                return (
                  <div key={s.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{s.title}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {attended} / {cap}
                      </span>
                    </div>
                    <Progress value={fill} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" /> Sponsor ROI
          </CardTitle>
          <CardDescription>Sponsorship reach and lead attribution.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Sponsors</p>
              <p className="mt-1 text-2xl font-semibold">{sponsorCount}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Leads captured</p>
              <p className="mt-1 text-2xl font-semibold">{leadCount}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Avg leads / sponsor</p>
              <p className="mt-1 text-2xl font-semibold">
                {sponsorCount ? Math.round(leadCount / sponsorCount) : 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> AI post-event summary
            </CardTitle>
            <CardDescription>Reviewable and editable before you publish or share.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap rounded-lg border bg-secondary/30 p-4 text-sm leading-relaxed">
              {aiSummary.output}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> AI sponsor ROI summary
            </CardTitle>
            <CardDescription>Reviewable and editable before sharing with sponsors.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap rounded-lg border bg-secondary/30 p-4 text-sm leading-relaxed">
              {aiSponsorRoi.output}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

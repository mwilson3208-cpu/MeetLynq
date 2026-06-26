import { Building2, Users, TrendingUp, Download, CalendarClock } from "lucide-react";
import { db } from "@/lib/db";
import { PortalShell } from "@/components/layout/portal-shell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatCard, EmptyState, Progress } from "@/components/ui/misc";
import { SPONSOR_LEVELS, LEAD_QUALITY } from "@/lib/constants";

export const metadata = { title: "Sponsor portal" };

export default async function SponsorPortal() {
  const event =
    (await db.event.findFirst({ where: { slug: "growthscale-summit-2026" } })) ??
    (await db.event.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!event) {
    return <EmptyState icon={<Building2 />} title="No event found" description="Seed the demo data to preview the sponsor portal." />;
  }
  const sponsor = await db.sponsor.findFirst({
    where: { eventId: event.id },
    include: { leads: { orderBy: { createdAt: "desc" } } },
  });
  if (!sponsor) {
    return <EmptyState icon={<Building2 />} title="No sponsor profile" description="No sponsor has been added to this event yet." />;
  }
  const level = SPONSOR_LEVELS[sponsor.level] ?? { label: sponsor.level, tone: "neutral" as const };
  const hot = sponsor.leads.filter((l) => l.quality === "HOT").length;

  return (
    <PortalShell role="Sponsor" eventName={event.name} userName={sponsor.name}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{sponsor.name}</h1>
            <Badge tone={level.tone}>{level.label} sponsor</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Your sponsorship dashboard for {event.name}.</p>
        </div>
        <Button variant="outline"><Download className="size-4" /> Export leads</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Leads captured" value={sponsor.leads.length} icon={<Users />} tone="success" />
        <StatCard label="Hot leads" value={hot} icon={<TrendingUp />} tone="warning" />
        <StatCard label="Sponsor value score" value={sponsor.valueScore} icon={<TrendingUp />} hint="Out of 100" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lead pipeline</CardTitle>
            <CardDescription>Leads captured at your booth and via QR scans.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {sponsor.leads.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={<Users />} title="No leads yet" description="Leads will appear here as you scan badges and meet attendees." />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH>Company</TH>
                    <TH>Source</TH>
                    <TH>Quality</TH>
                  </TR>
                </THead>
                <TBody>
                  {sponsor.leads.slice(0, 12).map((l) => {
                    const q = LEAD_QUALITY[l.quality] ?? { label: l.quality, tone: "neutral" as const };
                    return (
                      <TR key={l.id}>
                        <TD className="font-medium">{l.name}</TD>
                        <TD className="text-muted-foreground">{l.company ?? "—"}</TD>
                        <TD><Badge tone="neutral">{l.source}</Badge></TD>
                        <TD><Badge tone={q.tone}>{q.label}</Badge></TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Value score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-muted-foreground">Sponsor ROI</span>
                <span className="font-medium">{sponsor.valueScore}/100</span>
              </div>
              <Progress value={sponsor.valueScore} />
              <p className="mt-3 text-sm text-muted-foreground">
                Based on lead volume, lead quality, booth check-ins, and booked meetings.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4 text-primary" /> Meeting requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Request 1:1 meetings with high-intent attendees. Your team can accept or propose new times.
              </p>
              <Button className="mt-3 w-full">Request a meeting</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}

import { Store, Users, QrCode, Download } from "lucide-react";
import { db } from "@/lib/db";
import { PortalShell } from "@/components/layout/portal-shell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatCard, EmptyState } from "@/components/ui/misc";
import { LEAD_QUALITY } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Exhibitor portal" };

export default async function ExhibitorPortal() {
  const event =
    (await db.event.findFirst({ where: { slug: "growthscale-summit-2026" } })) ??
    (await db.event.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!event) {
    return <EmptyState icon={<Store />} title="No event found" description="Seed the demo data to preview the exhibitor portal." />;
  }
  const exhibitor = await db.exhibitor.findFirst({
    where: { eventId: event.id },
    include: { leads: { orderBy: { createdAt: "desc" } } },
  });
  if (!exhibitor) {
    return <EmptyState icon={<Store />} title="No exhibitor profile" description="No exhibitor has been added to this event yet." />;
  }
  const hot = exhibitor.leads.filter((l) => l.quality === "HOT").length;

  return (
    <PortalShell role="Exhibitor" eventName={event.name} userName={exhibitor.name}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{exhibitor.name}</h1>
            {exhibitor.boothNumber && <Badge tone="primary">Booth {exhibitor.boothNumber}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Your exhibitor dashboard for {event.name}.</p>
        </div>
        <Button variant="outline"><Download className="size-4" /> Export leads</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Leads captured" value={exhibitor.leads.length} icon={<Users />} tone="success" />
        <StatCard label="Hot leads" value={hot} icon={<Users />} tone="warning" />
        <StatCard label="Booth" value={exhibitor.boothNumber ?? "—"} icon={<Store />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lead pipeline</CardTitle>
            <CardDescription>Everyone you&apos;ve scanned or met at your booth.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {exhibitor.leads.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={<Users />} title="No leads yet" description="Scan attendee badges to start building your pipeline." />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH>Company</TH>
                    <TH>Source</TH>
                    <TH>Quality</TH>
                    <TH>Captured</TH>
                  </TR>
                </THead>
                <TBody>
                  {exhibitor.leads.slice(0, 12).map((l) => {
                    const q = LEAD_QUALITY[l.quality] ?? { label: l.quality, tone: "neutral" as const };
                    return (
                      <TR key={l.id}>
                        <TD className="font-medium">{l.name}</TD>
                        <TD className="text-muted-foreground">{l.company ?? "—"}</TD>
                        <TD><Badge tone="neutral">{l.source}</Badge></TD>
                        <TD><Badge tone={q.tone}>{q.label}</Badge></TD>
                        <TD className="text-muted-foreground">{formatDate(l.createdAt)}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="size-4 text-primary" /> Badge scanner
            </CardTitle>
            <CardDescription>Capture leads in one tap.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed bg-secondary/40">
              <QrCode className="size-16 text-muted-foreground" />
            </div>
            <Button className="mt-4 w-full">Scan a badge</Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Works offline — leads sync when you reconnect.
            </p>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}

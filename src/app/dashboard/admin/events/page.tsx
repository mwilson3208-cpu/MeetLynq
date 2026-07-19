import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EVENT_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 100;

export default async function AdminEventsPage() {
  await requireAdmin();

  const [total, events] = await Promise.all([
    db.event.count(),
    db.event.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: { organization: true, _count: { select: { registrations: true } } },
    }),
  ]);

  return (
    <div>
      <Link href="/dashboard/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" /> Platform admin
      </Link>
      <PageHeader
        title="Events"
        description={`${total} event${total === 1 ? "" : "s"} across all workspaces${total > PAGE_SIZE ? ` — showing the newest ${PAGE_SIZE}` : ""}.`}
      />
      <Card className="min-w-0">
        <CardContent className="px-0">
          {events.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Event</TH>
                    <TH>Workspace</TH>
                    <TH>Status</TH>
                    <TH>Registered</TH>
                    <TH>Starts</TH>
                    <TH>Created</TH>
                  </TR>
                </THead>
                <TBody>
                  {events.map((e) => {
                    const status = EVENT_STATUS[e.status] ?? { label: e.status, tone: "neutral" as const };
                    return (
                      <TR key={e.id}>
                        <TD className="font-medium">{e.name}</TD>
                        <TD className="text-muted-foreground">{e.organization.name}</TD>
                        <TD><Badge tone={status.tone}>{status.label}</Badge></TD>
                        <TD>{e._count.registrations}</TD>
                        <TD className="text-muted-foreground">{formatDate(e.startsAt)}</TD>
                        <TD className="text-muted-foreground">{formatDate(e.createdAt)}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

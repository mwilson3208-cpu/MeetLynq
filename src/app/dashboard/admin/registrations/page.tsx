import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { REGISTRATION_STATUS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 100;

export default async function AdminRegistrationsPage() {
  await requireAdmin();

  const [total, regs] = await Promise.all([
    db.registration.count({ where: { status: { not: "CANCELED" } } }),
    db.registration.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: { event: { include: { organization: true } } },
    }),
  ]);

  return (
    <div>
      <Link href="/dashboard/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" /> Platform admin
      </Link>
      <PageHeader
        title="Registrations"
        description={`${total} active registration${total === 1 ? "" : "s"} platform-wide — showing the newest ${Math.min(PAGE_SIZE, regs.length)} (all statuses).`}
      />
      <Card className="min-w-0">
        <CardContent className="px-0">
          {regs.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">No registrations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Attendee</TH>
                    <TH>Email</TH>
                    <TH>Event</TH>
                    <TH>Workspace</TH>
                    <TH>Status</TH>
                    <TH>Registered</TH>
                  </TR>
                </THead>
                <TBody>
                  {regs.map((r) => {
                    const status = REGISTRATION_STATUS[r.status] ?? { label: r.status, tone: "neutral" as const };
                    return (
                      <TR key={r.id}>
                        <TD className="font-medium">{r.firstName} {r.lastName}</TD>
                        <TD className="text-muted-foreground">{r.email}</TD>
                        <TD className="text-muted-foreground">{r.event.name}</TD>
                        <TD className="text-muted-foreground">{r.event.organization.name}</TD>
                        <TD><Badge tone={status.tone}>{status.label}</Badge></TD>
                        <TD className="text-muted-foreground">{formatDateTime(r.createdAt)}</TD>
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

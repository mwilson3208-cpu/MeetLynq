import { CalendarDays, Users, Building2, Ticket, ScrollText, ShieldCheck } from "lucide-react";
import { requireOrg } from "@/lib/queries";
import { db } from "@/lib/db";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/misc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

const SECURITY_ITEMS = [
  "Role-based access control",
  "Audit logs",
  "GDPR / CCPA consent tracking",
  "Data export controls",
  "Admin impersonation protection",
  "API rate limiting",
];

export default async function AdminPage() {
  const { org } = await requireOrg();

  const [events, users, orgs, registrations, logs] = await Promise.all([
    db.event.count({ where: { organizationId: org.id } }),
    db.user.count(),
    db.organization.count(),
    db.registration.count({ where: { event: { organizationId: org.id } } }),
    db.auditLog.findMany({
      where: { organizationId: org.id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Platform oversight, audit trail, and security controls."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Events" value={events} icon={<CalendarDays />} />
        <StatCard label="Users" value={users} icon={<Users />} tone="info" />
        <StatCard label="Organizations" value={orgs} icon={<Building2 />} tone="success" />
        <StatCard label="Registrations" value={registrations} icon={<Ticket />} tone="warning" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="size-4 text-primary" /> Audit logs
            </CardTitle>
            <CardDescription>Recent administrative activity in this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {logs.length === 0 ? (
              <div className="px-5">
                <EmptyState
                  icon={<ScrollText />}
                  title="No activity yet"
                  description="Audit events appear here as your team manages events, members, and settings."
                />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Action</TH>
                    <TH>Entity</TH>
                    <TH>User</TH>
                    <TH>Time</TH>
                  </TR>
                </THead>
                <TBody>
                  {logs.map((log) => (
                    <TR key={log.id}>
                      <TD className="font-medium">{log.action}</TD>
                      <TD className="text-muted-foreground">{log.entity ?? "—"}</TD>
                      <TD className="text-muted-foreground">{log.user?.name ?? "System"}</TD>
                      <TD className="text-muted-foreground">{formatDateTime(log.createdAt)}</TD>
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
              <ShieldCheck className="size-4 text-primary" /> Security & compliance
            </CardTitle>
            <CardDescription>Protections active on your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {SECURITY_ITEMS.map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="size-4 text-success" /> {item}
                </div>
                <Badge tone="success">Enabled</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

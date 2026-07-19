import { CalendarDays, Users, Building2, DollarSign, ScrollText, ShieldCheck, UserPlus } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { PageHeader, StatCard, EmptyState, Avatar } from "@/components/ui/misc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EVENT_STATUS } from "@/lib/constants";
import { formatDateTime, formatDate, formatMoney } from "@/lib/utils";

export default async function AdminPage() {
  const admin = await requireAdmin();

  const [userCount, orgCount, eventCount, regCount, revenue, orgs, recentUsers, recentEvents, logs] =
    await Promise.all([
      db.user.count(),
      db.organization.count(),
      db.event.count(),
      db.registration.count({ where: { status: { not: "CANCELED" } } }),
      db.payment.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amountCents: true } }),
      db.organization.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { _count: { select: { members: true, events: true } } },
      }),
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { memberships: { include: { organization: true }, take: 1 } },
      }),
      db.event.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { organization: true, _count: { select: { registrations: true } } },
      }),
      db.auditLog.findMany({
        include: { user: true, organization: true },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
    ]);

  return (
    <div>
      <PageHeader
        title="Platform admin"
        description={`Signed in as ${admin.email} — platform-wide oversight across every workspace.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Users" value={userCount} icon={<Users />} href="/dashboard/admin/users" />
        <StatCard label="Workspaces" value={orgCount} icon={<Building2 />} tone="info" href="/dashboard/admin/workspaces" />
        <StatCard label="Events" value={eventCount} icon={<CalendarDays />} tone="primary" href="/dashboard/admin/events" />
        <StatCard label="Registrations" value={regCount} icon={<UserPlus />} tone="success" href="/dashboard/admin/registrations" />
        <StatCard label="Revenue" value={formatMoney(revenue._sum.amountCents ?? 0)} icon={<DollarSign />} tone="warning" href="/dashboard/admin/revenue" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" /> Workspaces
            </CardTitle>
            <CardDescription>Every organization on the platform, newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            {orgs.length === 0 ? (
              <EmptyState icon={<Building2 />} title="No workspaces yet" description="Organizations appear here as people sign up." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Workspace</TH>
                      <TH>Plan</TH>
                      <TH>Members</TH>
                      <TH>Events</TH>
                      <TH>Created</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {orgs.map((o) => (
                      <TR key={o.id}>
                        <TD className="font-medium">{o.name}</TD>
                        <TD><Badge tone="neutral">{o.plan}</Badge></TD>
                        <TD>{o._count.members}</TD>
                        <TD>{o._count.events}</TD>
                        <TD className="text-muted-foreground">{formatDate(o.createdAt)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-4 text-primary" /> Recent signups
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Avatar name={u.name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  {u.role === "PLATFORM_ADMIN" ? (
                    <Badge tone="primary">Admin</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">{u.memberships[0]?.organization.name ?? "—"}</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" /> Recent events
            </CardTitle>
            <CardDescription>Across all workspaces.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              recentEvents.map((e) => {
                const status = EVENT_STATUS[e.status] ?? { label: e.status, tone: "neutral" as const };
                return (
                  <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="min-w-0 truncate text-sm font-medium">{e.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.organization.name} · {e._count.registrations} registered
                      </p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="size-4 text-primary" /> Audit trail
            </CardTitle>
            <CardDescription>Latest actions across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit entries yet.</p>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium">{l.user?.name ?? "System"}</span>{" "}
                    <span className="text-muted-foreground">{l.action}</span>
                    <span className="block truncate text-xs text-muted-foreground">{l.organization?.name}</span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(l.createdAt)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" /> Access
          </CardTitle>
          <CardDescription>
            This page is restricted to platform administrators (role PLATFORM_ADMIN or an allowlisted admin email).
            Other signed-in users receive a 404.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

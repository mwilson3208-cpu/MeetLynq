import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, ScrollText, Ticket, CalendarDays, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { Avatar, StatCard } from "@/components/ui/misc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { REGISTRATION_STATUS, EVENT_STATUS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    include: {
      memberships: { include: { organization: { include: { _count: { select: { events: true, members: true } } } } } },
    },
  });
  if (!user) notFound();

  const orgIds = user.memberships.map((m) => m.organizationId);
  const [logs, registrations, eventsCreated] = await Promise.all([
    db.auditLog.findMany({
      where: { userId: user.id },
      include: { organization: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    // Attendee-side activity: registrations made with this user's email.
    db.registration.findMany({
      where: { email: user.email.toLowerCase() },
      include: { event: { include: { organization: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    orgIds.length
      ? db.event.findMany({
          where: { organizationId: { in: orgIds } },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { _count: { select: { registrations: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <Link href="/dashboard/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" /> All users
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size={56} />
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
              {user.name}
              {user.role === "PLATFORM_ADMIN" ? (
                <Badge tone="primary">Platform admin</Badge>
              ) : (
                <Badge tone="neutral">{user.role}</Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email} · joined {formatDate(user.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Workspaces" value={user.memberships.length} icon={<Building2 />} tone="info" />
        <StatCard label="Registrations" value={registrations.length} icon={<Ticket />} tone="success" />
        <StatCard label="Recent actions" value={logs.length} icon={<ScrollText />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" /> Workspaces
            </CardTitle>
            <CardDescription>Memberships and their roles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {user.memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workspace memberships.</p>
            ) : (
              user.memberships.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="min-w-0 truncate text-sm font-medium">{m.organization.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.organization._count.members} member{m.organization._count.members === 1 ? "" : "s"} · {m.organization._count.events} event{m.organization._count.events === 1 ? "" : "s"} · joined {formatDate(m.createdAt)}
                    </p>
                  </div>
                  <Badge tone={m.role === "OWNER" ? "primary" : "neutral"}>{m.role}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="size-4 text-primary" /> Event registrations
            </CardTitle>
            <CardDescription>Registrations made with this email address.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {registrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No registrations under this email.</p>
            ) : (
              registrations.map((r) => {
                const status = REGISTRATION_STATUS[r.status] ?? { label: r.status, tone: "neutral" as const };
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="min-w-0 truncate text-sm font-medium">{r.event.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.event.organization.name} · {formatDateTime(r.createdAt)}
                      </p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" /> Events in their workspaces
            </CardTitle>
            <CardDescription>Newest events across every workspace this user belongs to.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {eventsCreated.length === 0 ? (
              <p className="px-5 pb-2 text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Event</TH>
                      <TH>Status</TH>
                      <TH>Registered</TH>
                      <TH>Created</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {eventsCreated.map((e) => {
                      const status = EVENT_STATUS[e.status] ?? { label: e.status, tone: "neutral" as const };
                      return (
                        <TR key={e.id}>
                          <TD className="font-medium">{e.name}</TD>
                          <TD><Badge tone={status.tone}>{status.label}</Badge></TD>
                          <TD>{e._count.registrations}</TD>
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

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" /> Recent activity
            </CardTitle>
            <CardDescription>Latest audit-log entries by this user.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recorded activity.</p>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="text-foreground">{l.action}</span>
                    <span className="block truncate text-xs text-muted-foreground">{l.organization?.name}</span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(l.createdAt)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

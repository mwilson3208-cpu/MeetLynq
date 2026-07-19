import Link from "next/link";
import {
  CalendarDays,
  Users,
  CalendarClock,
  DollarSign,
  Sparkles,
  Plus,
  Pencil,
} from "lucide-react";
import { requireOrg } from "@/lib/queries";
import { db } from "@/lib/db";
import { PageHeader, StatCard, EmptyState, Avatar } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteEvent } from "./events/[id]/settings/actions";
import { EVENT_STATUS, EVENT_TYPES, labelOf } from "@/lib/constants";
import { formatDate, formatMoney, pct } from "@/lib/utils";

export default async function DashboardHome() {
  const { user, org } = await requireOrg();

  const [events, totalReg, totalMeetings, revenue, upcoming, ticketCount, memberCount] = await Promise.all([
    db.event.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { registrations: true, meetings: true } } },
    }),
    db.registration.count({ where: { event: { organizationId: org.id }, status: { not: "CANCELED" } } }),
    db.meeting.count({ where: { event: { organizationId: org.id } } }),
    db.payment.aggregate({
      where: { order: { event: { organizationId: org.id } }, status: "SUCCEEDED" },
      _sum: { amountCents: true },
    }),
    db.event.findFirst({
      where: { organizationId: org.id, status: { in: ["PUBLISHED", "LIVE"] } },
      orderBy: { startsAt: "asc" },
    }),
    db.ticket.count({ where: { event: { organizationId: org.id }, isActive: true } }),
    db.organizationMember.count({ where: { organizationId: org.id } }),
  ]);

  // Launch checklist computed from real workspace data (was hardcoded).
  const launchChecklist: { label: string; done: boolean; href: string }[] = [
    { label: "Create your event", done: events.length > 0, href: "/dashboard/events/new" },
    {
      label: "Build a branded page",
      done: events.some((e) => Boolean(e.tagline) || Boolean(e.description)),
      href: events[0] ? `/dashboard/events/${events[0].id}/builder` : "/dashboard/events/new",
    },
    {
      label: "Set up tickets",
      done: ticketCount > 0,
      href: events[0] ? `/dashboard/events/${events[0].id}/tickets` : "/dashboard/events/new",
    },
    { label: "Invite your team", done: memberCount > 1, href: "/dashboard/team" },
    {
      label: "Publish & promote",
      done: Boolean(upcoming),
      href: events[0] ? `/dashboard/events/${events[0].id}/builder` : "/dashboard/events/new",
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description={`Here's what's happening across ${org.name}.`}
        action={
          <ButtonLink href="/dashboard/events/new">
            <Plus className="size-4" /> Create event
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active events" value={events.length} icon={<CalendarDays />} hint={`${events.filter((e) => e.status === "PUBLISHED" || e.status === "LIVE").length} live or published`} />
        <StatCard label="Total registrations" value={totalReg} icon={<Users />} tone="success" />
        <StatCard label="Meetings booked" value={totalMeetings} icon={<CalendarClock />} tone="info" />
        <StatCard label="Revenue" value={formatMoney(revenue._sum.amountCents ?? 0)} icon={<DollarSign />} tone="warning" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your events</h2>
            <Link href="/dashboard/events" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {events.length === 0 ? (
            <EmptyState
              icon={<CalendarDays />}
              title="No events yet"
              description="Create your first event and let the AI setup assistant build it with you."
              action={<ButtonLink href="/dashboard/events/new"><Plus className="size-4" /> Create event</ButtonLink>}
            />
          ) : (
            <div className="space-y-3">
              {events.map((e) => {
                const status = EVENT_STATUS[e.status];
                return (
                  <Card key={e.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center gap-4 p-4">
                      <Link href={`/dashboard/events/${e.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                          <CalendarDays className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            {/* min-w-0: without it this flex item's minimum is the
                                full text width, which forces horizontal overflow
                                on narrow screens. */}
                            <p className="min-w-0 truncate font-semibold">{e.name}</p>
                            <Badge tone={status.tone} className="shrink-0">{status.label}</Badge>
                          </div>
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {labelOf(EVENT_TYPES, e.type)} · {formatDate(e.startsAt)} · {e.city ?? "—"}
                          </p>
                        </div>
                        <div className="hidden text-right sm:block">
                          <p className="text-sm font-semibold">{e._count.registrations}</p>
                          <p className="text-xs text-muted-foreground">registered</p>
                        </div>
                      </Link>
                      <div className="flex shrink-0 items-center gap-1">
                        <ButtonLink
                          href={`/dashboard/events/${e.id}/settings`}
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${e.name}`}
                        >
                          <Pencil /> Edit
                        </ButtonLink>
                        <DeleteButton
                          action={deleteEvent}
                          id={e.id}
                          eventId={e.id}
                          redirectTo="/dashboard"
                          confirmText={`Permanently delete "${e.name}" and ALL its data (registrations, tickets, sessions)? This cannot be undone.`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> Next up
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming ? (
                <div>
                  <p className="font-semibold">{upcoming.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatDate(upcoming.startsAt, { weekday: "long", month: "long", day: "numeric" })}</p>
                  {upcoming.capacity && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Capacity</span>
                        <span>{pct(events.find((e) => e.id === upcoming.id)?._count.registrations ?? 0, upcoming.capacity)}%</span>
                      </div>
                    </div>
                  )}
                  <ButtonLink href={`/dashboard/events/${upcoming.id}`} variant="outline" size="sm" className="mt-4 w-full">
                    Open event
                  </ButtonLink>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming published events.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Launch checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {launchChecklist.map((item) =>
                item.done ? (
                  <div key={item.label} className="flex items-center gap-2.5 rounded-md p-1.5 text-sm">
                    <span className="flex size-4 items-center justify-center rounded-full bg-success text-[10px] text-success-foreground">
                      ✓
                    </span>
                    <span className="text-muted-foreground line-through">{item.label}</span>
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-md p-1.5 text-sm hover:bg-secondary/60"
                  >
                    <span className="flex size-4 items-center justify-center rounded-full border text-[10px]" />
                    {item.label}
                  </Link>
                ),
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Avatar name={org.name} size={40} />
              <div>
                <p className="text-sm font-medium">{org.name}</p>
                <p className="text-xs text-muted-foreground">{org.plan} plan</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

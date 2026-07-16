import Link from "next/link";
import { CalendarDays, Plus, MapPin, Pencil } from "lucide-react";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteEvent } from "./[id]/settings/actions";
import { requireOrg } from "@/lib/queries";
import { db } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EVENT_STATUS, EVENT_TYPES, EVENT_FORMATS, labelOf } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

// Status filter chips. "Ended" groups ENDED with ARCHIVED so wrapped-up
// events don't disappear from every filter.
const FILTERS: { label: string; key: string; statuses: string[] | null }[] = [
  { label: "All", key: "all", statuses: null },
  { label: "Draft", key: "draft", statuses: ["DRAFT"] },
  { label: "Published", key: "published", statuses: ["PUBLISHED"] },
  { label: "Live", key: "live", statuses: ["LIVE"] },
  { label: "Ended", key: "ended", statuses: ["ENDED", "ARCHIVED"] },
];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { org } = await requireOrg();
  const sp = await searchParams;
  const active = FILTERS.find((f) => f.key === sp.status) ?? FILTERS[0];

  const events = await db.event.findMany({
    where: {
      organizationId: org.id,
      ...(active.statuses ? { status: { in: active.statuses } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { registrations: true, sessions: true, sponsors: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Events"
        description="Create, manage, and measure every event in your workspace."
        action={
          <ButtonLink href="/dashboard/events/new">
            <Plus className="size-4" /> New event
          </ButtonLink>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <ButtonLink
            key={f.key}
            href={f.key === "all" ? "/dashboard/events" : `/dashboard/events?status=${f.key}`}
            variant={f.key === active.key ? "secondary" : "ghost"}
            size="sm"
          >
            {f.label}
          </ButtonLink>
        ))}
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={active.statuses ? `No ${active.label.toLowerCase()} events` : "No events yet"}
          description={
            active.statuses
              ? "Nothing matches this filter — try another status."
              : "Your events will appear here. Create your first one to get started."
          }
          action={<ButtonLink href="/dashboard/events/new"><Plus className="size-4" /> Create event</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => {
            const status = EVENT_STATUS[e.status];
            return (
              <Card key={e.id} className="h-full overflow-hidden transition-shadow hover:shadow-md">
                <Link href={`/dashboard/events/${e.id}`} className="block">
                  <div
                    className="h-24 bg-brand-gradient"
                    style={{ background: `linear-gradient(135deg, ${e.brandColor}22, ${e.brandColor}08)` }}
                  />
                </Link>
                <CardContent className="p-5">
                  <Link href={`/dashboard/events/${e.id}`} className="block">
                    <div className="-mt-9 mb-3 flex size-12 items-center justify-center rounded-xl border bg-card shadow-sm">
                      <CalendarDays className="size-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <Badge tone="neutral">{labelOf(EVENT_FORMATS, e.format)}</Badge>
                    </div>
                    <h3 className="mt-3 font-semibold leading-tight">{e.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{e.tagline ?? labelOf(EVENT_TYPES, e.type)}</p>
                    <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(e.startsAt)}</span>
                      {e.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" /> {e.city}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm">
                    <div className="flex gap-4">
                      <span><strong>{e._count.registrations}</strong> <span className="text-muted-foreground">registered</span></span>
                      <span><strong>{e._count.sessions}</strong> <span className="text-muted-foreground">sessions</span></span>
                    </div>
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
                        redirectTo="/dashboard/events"
                        confirmText={`Permanently delete "${e.name}" and ALL its data (registrations, tickets, sessions)? This cannot be undone.`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

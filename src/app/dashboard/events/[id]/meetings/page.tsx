import {
  CalendarClock,
  CalendarCheck,
  CheckCircle2,
  UserX,
  Clock,
  MapPin,
  Plus,
} from "lucide-react";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import { formatTime, pct } from "@/lib/utils";
import { MEETING_STATUS } from "@/lib/constants";
import { StatCard, EmptyState } from "@/components/ui/misc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

const STATUS_FILTERS = ["All", "Requested", "Approved", "Completed", "No-show", "Canceled"];

export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getEventOr404(id);

  const meetings = await db.meeting.findMany({
    where: { eventId: id },
    include: {
      slot: true,
      location: true,
      participants: { include: { participant: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const slots = await db.meetingSlot.findMany({
    where: { eventId: id },
    orderBy: { startsAt: "asc" },
  });

  const locations = await db.meetingLocation.findMany({
    where: { eventId: id },
  });

  const total = meetings.length;
  const approved = meetings.filter((m) => m.status === "APPROVED").length;
  const completed = meetings.filter((m) => m.status === "COMPLETED").length;
  const noShows = meetings.filter((m) => m.noShow).length;
  const noShowRate = pct(noShows, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Meeting scheduler</h2>
          <p className="text-sm text-muted-foreground">
            Book and track 1:1 and group meetings across slots and locations.
          </p>
        </div>
        <Button>
          <Plus /> Schedule meeting
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total meetings" value={total} icon={<CalendarClock />} />
        <StatCard label="Approved" value={approved} icon={<CalendarCheck />} tone="success" />
        <StatCard label="Completed" value={completed} icon={<CheckCircle2 />} tone="info" />
        <StatCard
          label="No-show rate"
          value={`${noShowRate}%`}
          icon={<UserX />}
          tone="warning"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f, i) => (
          <button
            key={f}
            className={
              i === 0
                ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
            }
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Meetings</CardTitle>
            <CardDescription>All scheduled and requested meetings.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {total === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<CalendarClock />}
                  title="No meetings yet"
                  description="Schedule your first meeting to start building the agenda."
                  action={
                    <Button>
                      <Plus /> Schedule meeting
                    </Button>
                  }
                />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Participants</TH>
                    <TH>Time</TH>
                    <TH>Location</TH>
                    <TH>Type</TH>
                    <TH>Mode</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {meetings.map((m) => {
                    const names = m.participants
                      .map((p) => p.participant.name)
                      .join(" ↔ ");
                    const meta =
                      MEETING_STATUS[m.status] ?? { label: m.status, tone: "neutral" as const };
                    return (
                      <TR key={m.id}>
                        <TD className="font-medium">{names || "—"}</TD>
                        <TD>{m.slot ? formatTime(m.slot.startsAt) : "Unscheduled"}</TD>
                        <TD>{m.location?.name ?? "—"}</TD>
                        <TD>{m.type}</TD>
                        <TD>
                          <Badge tone={m.mode === "ONLINE" ? "info" : "neutral"}>
                            {m.mode === "ONLINE" ? "Online" : "In-person"}
                          </Badge>
                        </TD>
                        <TD>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </TD>
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
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4 text-primary" /> Meeting slots
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No slots configured.</p>
              ) : (
                slots.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <span className="font-medium">{s.label ?? "Slot"}</span>
                    <span className="text-muted-foreground">
                      {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" /> Locations / tables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No locations configured.</p>
              ) : (
                locations.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.kind}</p>
                    </div>
                    <Badge tone="neutral">Seats {l.capacity}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
